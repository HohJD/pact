import { z } from "zod";

import { AnthropicProvider } from "./anthropic-provider";
import { ANALYST_REPAIR_PROMPT } from "./prompts";
import {
  LLMOutputError,
  parseWithSchema,
  ProviderUnavailableError,
  type ChatJSONOptions,
  type LLMProvider,
} from "./provider-core";
import { createAnswerExtractor, parseSSE } from "./streaming";

export {
  extractJsonBlock,
  LLMOutputError,
  parseWithSchema,
  ProviderUnavailableError,
  stripFences,
  type ChatJSONOptions,
  type LLMProvider,
} from "./provider-core";

class FormatUnsupportedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FormatUnsupportedError";
  }
}

const BASE = "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 20_000;
const FREE_ONLY = process.env.OPENROUTER_FREE_ONLY === "true";
const FREE_DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
// Free models may emit hidden reasoning by default; disabling it keeps responses
// under TIMEOUT_MS. Set OPENROUTER_REASONING=true to let the model reason.
const REASONING_DISABLED = process.env.OPENROUTER_REASONING !== "true";

export class OpenRouterProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENROUTER_MODEL ||
      (FREE_ONLY ? FREE_DEFAULT_MODEL : "anthropic/claude-sonnet-4.5"),
    private readonly embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL ||
      "openai/text-embedding-3-small",
  ) {
    if (FREE_ONLY && !this.model.endsWith(":free")) {
      throw new Error(
        `OPENROUTER_FREE_ONLY is set but OPENROUTER_MODEL="${this.model}" is not a free model (must end in ":free")`,
      );
    }
  }

  isConfigured() {
    return true;
  }

  private async call(
    messages: { role: string; content: string }[],
    opts: {
      jsonSchema?: object;
      format: "schema" | "json" | "text";
      temperature?: number;
      maxTokens?: number;
    },
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3001",
          "X-Title": "PACT",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 4000,
          ...(REASONING_DISABLED ? { reasoning: { enabled: false } } : {}),
          ...(opts.format === "schema"
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "pact_response",
                    strict: true,
                    schema: opts.jsonSchema,
                  },
                },
              }
            : opts.format === "json"
              ? { response_format: { type: "json_object" } }
              : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (
          res.status >= 400 &&
          res.status < 500 &&
          /response_format|json_schema|unsupported|not supported/i.test(body)
        ) {
          throw new FormatUnsupportedError(`HTTP ${res.status}`);
        }
        throw new Error(`OpenRouter HTTP ${res.status}`);
      }
      const json = await res.json();
      console.info(
        `[pact-ai] chat model=${this.model} format=${opts.format} latency=${Date.now() - started}ms`,
      );
      return json.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  /** Same request as `call` but with `stream: true` — returns the raw response. */
  private async callStream(
    messages: { role: string; content: string }[],
    opts: {
      jsonSchema?: object;
      format: "schema" | "json" | "text";
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3001",
          "X-Title": "PACT",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 4000,
          stream: true,
          ...(REASONING_DISABLED ? { reasoning: { enabled: false } } : {}),
          ...(opts.format === "schema"
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "pact_response",
                    strict: true,
                    schema: opts.jsonSchema,
                  },
                },
              }
            : opts.format === "json"
              ? { response_format: { type: "json_object" } }
              : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (
          res.status >= 400 &&
          res.status < 500 &&
          /response_format|json_schema|unsupported|not supported/i.test(body)
        ) {
          throw new FormatUnsupportedError(`HTTP ${res.status}`);
        }
        throw new Error(`OpenRouter HTTP ${res.status}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async chatJSON<T>({
    system,
    user,
    schema,
    schemaName,
    temperature,
    maxTokens,
  }: ChatJSONOptions<T>) {
    const jsonSchema = z.toJSONSchema(schema, { io: "input" });
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    // Free-tier models often reject response_format — walk the ladder:
    // strict json_schema → json_object → plain text with a JSON block.
    let raw = "";
    let lastErr: unknown = null;
    for (const format of ["schema", "json", "text"] as const) {
      try {
        const msgs =
          format === "text"
            ? [...messages, { role: "user", content: "Return JSON only — no prose." }]
            : messages;
        raw = await this.call(msgs, { jsonSchema, format, temperature, maxTokens });
        let data = parseWithSchema(raw, schema);
        if (data === null) {
          console.warn(`[pact-ai] ${schemaName}: invalid JSON (${format}) — repair turn`);
          raw = await this.call(
            [...msgs, { role: "assistant", content: raw }, { role: "user", content: ANALYST_REPAIR_PROMPT }],
            { jsonSchema, format, temperature, maxTokens },
          );
          data = parseWithSchema(raw, schema);
        }
        if (data !== null) return { data, raw, model: this.model };
        lastErr = new LLMOutputError(`${schemaName}: validation failed (${format})`, raw);
      } catch (err) {
        if (err instanceof FormatUnsupportedError) {
          console.warn(`[pact-ai] ${schemaName}: ${format} format unsupported — trying next`);
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    console.warn(`[pact-ai] ${schemaName}: validation failed across all formats`);
    throw lastErr instanceof Error
      ? lastErr
      : new LLMOutputError(`${schemaName}: model output failed schema validation`, raw);
  }

  /**
   * Streaming completion over the same format ladder as `chatJSON`. `onDelta`
   * receives unescaped fragments of the `"answer"` field as they arrive; the
   * resolved value is the same validated payload `chatJSON` would return.
   * Validation failure throws — the caller decides whether to fall back.
   */
  async chatJSONStream<T>(
    {
      system,
      user,
      schema,
      schemaName,
      temperature,
      maxTokens,
    }: ChatJSONOptions<T>,
    onDelta: (text: string) => void,
  ) {
    const jsonSchema = z.toJSONSchema(schema, { io: "input" });
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    let raw = "";
    let lastErr: unknown = null;
    for (const format of ["schema", "json", "text"] as const) {
      try {
        const msgs =
          format === "text"
            ? [...messages, { role: "user", content: "Return JSON only — no prose." }]
            : messages;
        const res = await this.callStream(msgs, {
          jsonSchema,
          format,
          temperature,
          maxTokens,
        });
        if (!res.body) throw new Error("OpenRouter stream has no body");
        const extract = createAnswerExtractor(onDelta);
        for await (const payload of parseSSE(res.body)) {
          let delta = "";
          try {
            delta = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
          } catch {
            continue;
          }
          if (delta) {
            raw += delta;
            extract(delta);
          }
        }
        const data = parseWithSchema(raw, schema);
        if (data !== null) return { data, raw, model: this.model };
        lastErr = new LLMOutputError(`${schemaName}: validation failed (${format})`, raw);
      } catch (err) {
        if (err instanceof FormatUnsupportedError) {
          console.warn(`[pact-ai] ${schemaName}: ${format} stream unsupported — trying next`);
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new LLMOutputError(`${schemaName}: model output failed schema validation`, raw);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (FREE_ONLY) {
      throw new ProviderUnavailableError(
        "embeddings disabled: OpenRouter has no free embedding models (OPENROUTER_FREE_ONLY=true)",
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE}/embeddings`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3001",
          "X-Title": "PACT",
        },
        body: JSON.stringify({ model: this.embeddingModel, input: texts }),
      });
      if (!res.ok) throw new Error(`OpenRouter embeddings HTTP ${res.status}`);
      const json = await res.json();
      return json.data.map((d: { embedding: number[] }) => d.embedding);
    } finally {
      clearTimeout(timer);
    }
  }
}

export class NullProvider implements LLMProvider {
  isConfigured() {
    return false;
  }
  chatJSON(): Promise<never> {
    throw new ProviderUnavailableError();
  }
  embed(): Promise<never> {
    throw new ProviderUnavailableError();
  }
}

export function getProvider(): LLMProvider {
  const forced = process.env.PACT_LLM_PROVIDER; // "anthropic" | "openrouter" | unset
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (forced === "anthropic")
    return anthropicKey ? new AnthropicProvider(anthropicKey) : new NullProvider();
  if (forced === "openrouter")
    return openRouterKey
      ? new OpenRouterProvider(openRouterKey)
      : new NullProvider();
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  return openRouterKey ? new OpenRouterProvider(openRouterKey) : new NullProvider();
}
