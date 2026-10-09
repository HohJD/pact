import { z } from "zod";

export interface ChatJSONOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  chatJSON<T>(
    opts: ChatJSONOptions<T>,
  ): Promise<{ data: T; raw: string; model: string }>;
  /**
   * Streaming variant: invokes `onDelta` with unescaped fragments of the
   * response's `"answer"` string field as they arrive, then resolves with the
   * full validated payload. Optional — providers may omit it.
   */
  chatJSONStream?<T>(
    opts: ChatJSONOptions<T>,
    onDelta: (text: string) => void,
  ): Promise<{ data: T; raw: string; model: string }>;
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

export function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/** Extract the first balanced {…} block — for models that wrap JSON in prose. */
export function extractJsonBlock(raw: string): string | null {
  const clean = stripFences(raw);
  const start = clean.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < clean.length; i++) {
    const c = clean[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return clean.slice(start, i + 1);
    }
  }
  return null;
}

export function parseWithSchema<T>(raw: string, schema: z.ZodType<T>): T | null {
  const candidate = extractJsonBlock(raw);
  if (!candidate) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(candidate));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
