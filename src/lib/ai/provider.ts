import { z } from "zod";

import { ANALYST_REPAIR_PROMPT } from "./prompts";

export interface ChatJSONOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  chatJSON<T>(opts: ChatJSONOptions<T>): Promise<{ data: T; raw: string; model: string }>;
  embed(texts: string[]): Promise<number[][]>;
  isConfigured(): boolean;
}

export class ProviderUnavailableError extends Error {
  constructor(msg = "LLM provider is not configured") {
    super(msg);
    this.name = "ProviderUnavailableError";
  }
}

export class LLMOutputError extends Error {
  constructor(
    message: string,
    public readonly raw?: string,
  ) {
    super(message);
    this.name = "LLMOutputError";
  }
}

const BASE = "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 20_000;
const FREE_ONLY = process.env.OPENROUTER_FREE_ONLY === "true";
const FREE_DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

export class OpenRouterProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENROUTER_MODEL ??
      (FREE_ONLY ? FREE_DEFAULT_MODEL : "anthropic/claude-sonnet-4.5"),
    private readonly embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL ??
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
    opts: { jsonSchema?: object; temperature?: number; maxTokens?: number },
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
          ...(opts.jsonSchema
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
            : {}),
        }),
      });
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
      const json = await res.json();
      console.info(
        `[pact-ai] chat model=${this.model} latency=${Date.now() - started}ms`,
      );
      return json.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  private parse<T>(raw: string, schema: z.ZodType<T>): T | null {
    try {
      const parsed = schema.safeParse(JSON.parse(stripFences(raw)));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
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
    let raw = await this.call(messages, { jsonSchema, temperature, maxTokens });
    let data = this.parse(raw, schema);
    if (data === null) {
      console.warn(`[pact-ai] ${schemaName}: invalid JSON — retrying with repair prompt`);
      raw = await this.call(
        [...messages, { role: "assistant", content: raw }, { role: "user", content: ANALYST_REPAIR_PROMPT }],
        { jsonSchema, temperature, maxTokens },
      );
      data = this.parse(raw, schema);
    }
    if (data === null) {
      console.warn(`[pact-ai] ${schemaName}: validation failed after repair`);
      throw new LLMOutputError(`${schemaName}: model output failed schema validation`, raw);
    }
    return { data, raw, model: this.model };
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
  const key = process.env.OPENROUTER_API_KEY;
  return key ? new OpenRouterProvider(key) : new NullProvider();
}
