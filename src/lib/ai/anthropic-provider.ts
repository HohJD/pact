import { z } from "zod";

import { ANALYST_REPAIR_PROMPT } from "./prompts";
import {
  LLMOutputError,
  parseWithSchema,
  ProviderUnavailableError,
  type ChatJSONOptions,
  type LLMProvider,
} from "./provider-core";
import { createAnswerExtractor, parseSSE } from "./streaming";

const BASE = "https://api.anthropic.com/v1";
const TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 60_000;

const TOOL_NAME = "pact_response";
const TOOL_DESCRIPTION = "Return the structured response.";

function isSchemaRejection(status: number, body: string): boolean {
  return (
    status === 400 &&
    /strict|additionalProperties|not supported|input_schema|schema/i.test(body)
  );
}

function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      const key = k === "oneOf" ? "anyOf" : k;
      if (k === "maxItems") continue;
      if (k === "minItems" && typeof v === "number" && v > 1) continue;
      out[key] = strictify(v);
    }
    if (
      out.type === "object" &&
      out.properties !== undefined &&
      out.additionalProperties === undefined
    ) {
      out.additionalProperties = false;
    }
    return out;
  }
  return node;
}

/**
 * JSON schema for a tool's `input_schema`. Anthropic always rejects a top-level
 * `$schema` key; in `strict` mode it additionally requires `anyOf` (not
 * `oneOf`), forbids `maxItems`/`minItems > 1`, and requires every object with
 * properties to set `additionalProperties: false`.
 */
export function toAnthropicInputSchema(
  schema: z.ZodType<unknown>,
  { strict }: { strict: boolean },
): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete js.$schema;
  return strict ? (strictify(js) as Record<string, unknown>) : js;
}

export class AnthropicProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    private readonly workspaceId = process.env.ANTHROPIC_WORKSPACE_ID || "",
  ) {}

  isConfigured() {
    return true;
  }

  private headers() {
    return {
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(this.workspaceId ? { "anthropic-workspace-id": this.workspaceId } : {}),
    };
  }

  private async request(
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${BASE}/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private baseBody<T>(opts: ChatJSONOptions<T>, extraSystem = "") {
    return {
      model: this.model,
      system: opts.system + extraSystem,
      messages: [{ role: "user" as const, content: opts.user }],
      max_tokens: opts.maxTokens ?? 4000,
    };
  }

  private toolBody<T>(
    opts: ChatJSONOptions<T>,
    { strict, stream }: { strict: boolean; stream?: boolean },
  ) {
    return {
      ...this.baseBody(opts),
      tools: [
        {
          name: TOOL_NAME,
          description: TOOL_DESCRIPTION,
          input_schema: toAnthropicInputSchema(opts.schema, { strict }),
          ...(strict ? { strict: true } : {}),
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      ...(stream ? { stream: true } : {}),
    };
  }

  private async textCall<T>(
    opts: ChatJSONOptions<T>,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const started = Date.now();
    const res = await this.request(
      {
        model: this.model,
        system: opts.system + "\n\nReturn JSON only — no prose.",
        messages,
        max_tokens: opts.maxTokens ?? 4000,
      },
      TIMEOUT_MS,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const json = await res.json();
    console.info(
      `[pact-ai] chat model=${this.model} format=text latency=${Date.now() - started}ms`,
    );
    return (json.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  }

  async chatJSON<T>(opts: ChatJSONOptions<T>) {
    const { schema, schemaName } = opts;
    // strict tool → non-strict tool → plain text (on schema rejections only;
    // a Zod failure after a successful call throws so the caller can fall back)
    for (const mode of ["strict", "tool", "text"] as const) {
      const started = Date.now();
      if (mode === "text") {
        const raw = await this.textCall(opts, [
          { role: "user", content: opts.user },
        ]);
        const data = parseWithSchema(raw, schema);
        if (data !== null) return { data, raw, model: this.model };
        throw new LLMOutputError(
          `${schemaName}: validation failed (text)`,
          raw,
        );
      }

      const res = await this.request(
        this.toolBody(opts, { strict: mode === "strict" }),
        TIMEOUT_MS,
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (isSchemaRejection(res.status, body)) {
          console.warn(
            `[pact-ai] ${schemaName}: ${mode === "strict" ? "strict " : ""}schema rejected — falling back`,
          );
          continue;
        }
        throw new Error(
          `Anthropic HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
        );
      }

      const json = await res.json();
      console.info(
        `[pact-ai] chat model=${this.model} format=${mode} latency=${Date.now() - started}ms stop=${json.stop_reason} out_tokens=${json.usage?.output_tokens}`,
      );
      const toolBlock = (json.content ?? []).find(
        (b: { type: string; name?: string }) =>
          b.type === "tool_use" && b.name === TOOL_NAME,
      );

      if (toolBlock) {
        const raw = JSON.stringify(toolBlock.input ?? {});
        const data = schema.safeParse(toolBlock.input);
        if (data.success) return { data: data.data, raw, model: this.model };

        // one repair turn in text mode (strict output can still fail Zod on
        // stripped min/max constraints)
        console.warn(
          `[pact-ai] ${schemaName}: invalid tool input — repair turn: ${data.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")} ${i.message}`)
            .join("; ")}`,
        );
        const repaired = await this.textCall(opts, [
          { role: "user", content: opts.user },
          { role: "assistant", content: raw },
          { role: "user", content: ANALYST_REPAIR_PROMPT },
        ]);
        const fixed = parseWithSchema(repaired, schema);
        if (fixed !== null)
          return { data: fixed, raw: repaired, model: this.model };
        throw new LLMOutputError(
          `${schemaName}: validation failed (${mode})`,
          raw,
        );
      }

      // no tool_use block — try whatever text came back
      const raw = (json.content ?? [])
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("");
      const data = parseWithSchema(raw, schema);
      if (data !== null) return { data, raw, model: this.model };
      throw new LLMOutputError(`${schemaName}: no tool_use block`, raw);
    }
    // unreachable — the "text" arm always returns or throws
    throw new LLMOutputError(`${schemaName}: model output failed validation`);
  }

  async chatJSONStream<T>(
    opts: ChatJSONOptions<T>,
    onDelta: (text: string) => void,
  ) {
    const { schema, schemaName } = opts;
    // strict tool → non-strict tool → text, on schema rejections only
    for (const mode of ["strict", "tool", "text"] as const) {
      const started = Date.now();
      const body =
        mode === "text"
          ? {
              ...this.baseBody(opts, "\n\nReturn JSON only — no prose."),
              stream: true,
            }
          : this.toolBody(opts, { strict: mode === "strict", stream: true });
      const res = await this.request(body, STREAM_TIMEOUT_MS);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (isSchemaRejection(res.status, text) && mode !== "text") {
          console.warn(
            `[pact-ai] ${schemaName}: ${mode === "strict" ? "strict " : ""}schema rejected — falling back`,
          );
          continue;
        }
        throw new Error(
          `Anthropic HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
        );
      }
      if (!res.body) throw new Error("Anthropic stream has no body");

      const extract = createAnswerExtractor(onDelta);
      let raw = "";
      for await (const payload of parseSSE(res.body)) {
        let ev: {
          type?: string;
          delta?: { type?: string; partial_json?: string; text?: string };
        };
        try {
          ev = JSON.parse(payload);
        } catch {
          continue;
        }
        if (ev.type !== "content_block_delta") continue;
        const fragment =
          ev.delta?.type === "input_json_delta"
            ? (ev.delta.partial_json ?? "")
            : ev.delta?.type === "text_delta"
              ? (ev.delta.text ?? "")
              : "";
        if (fragment) {
          raw += fragment;
          extract(fragment);
        }
      }
      console.info(
        `[pact-ai] chat model=${this.model} format=${mode}-stream latency=${Date.now() - started}ms`,
      );

      const data = parseWithSchema(raw, schema);
      if (data !== null) return { data, raw, model: this.model };
      throw new LLMOutputError(
        `${schemaName}: validation failed (${mode}-stream)`,
        raw,
      );
    }
    throw new LLMOutputError(`${schemaName}: model output failed validation`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async embed(_texts: string[]): Promise<number[][]> {
    throw new ProviderUnavailableError(
      "embeddings not available via Anthropic — local embeddings are used instead",
    );
  }
}
