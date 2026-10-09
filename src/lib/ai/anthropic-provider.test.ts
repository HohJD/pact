import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  AnthropicProvider,
  toAnthropicInputSchema,
} from "./anthropic-provider";
import { OpenRouterProvider, getProvider } from "./provider";

const Schema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}
function toolUse(input: unknown) {
  return jsonResponse({
    content: [{ type: "tool_use", name: "pact_response", input }],
  });
}
function text(content: string) {
  return jsonResponse({ content: [{ type: "text", text: content }] });
}
function httpError(status: number, body: string) {
  return new Response(body, { status });
}
function sse(frames: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}
const delta = (partial_json: string) =>
  `event: content_block_delta\ndata: ${JSON.stringify({
    type: "content_block_delta",
    delta: { type: "input_json_delta", partial_json },
  })}\n\n`;

const opts = { system: "s", user: "u", schema: Schema, schemaName: "t" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("toAnthropicInputSchema", () => {
  const Complex = z.object({
    action: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("a"), x: z.number() }),
      z.object({ kind: z.literal("b"), y: z.string() }),
    ]),
    tags: z.array(z.string()).min(2).max(4),
    nested: z.object({ deep: z.object({ v: z.boolean() }) }),
  });

  function findKeys(node: unknown, key: string): number {
    if (Array.isArray(node))
      return node.reduce((n, c) => n + findKeys(c, key), 0);
    if (node && typeof node === "object")
      return Object.entries(node).reduce(
        (n, [k, v]) => n + (k === key ? 1 : 0) + findKeys(v, key),
        0,
      );
    return 0;
  }
  function objectsMissingAP(node: unknown): number {
    if (Array.isArray(node))
      return node.reduce((n, c) => n + objectsMissingAP(c), 0);
    if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      const self =
        o.type === "object" &&
        o.properties !== undefined &&
        o.additionalProperties === undefined
          ? 1
          : 0;
      return (
        self +
        Object.values(o).reduce<number>(
          (n, v) => n + objectsMissingAP(v),
          0,
        )
      );
    }
    return 0;
  }

  it("strict mode rewrites to Anthropic's supported subset", () => {
    const js = toAnthropicInputSchema(Complex, { strict: true });
    expect(js.$schema).toBeUndefined();
    expect(findKeys(js, "oneOf")).toBe(0);
    expect(findKeys(js, "anyOf")).toBeGreaterThan(0);
    expect(findKeys(js, "maxItems")).toBe(0);
    expect(findKeys(js, "minItems")).toBe(0);
    expect(objectsMissingAP(js)).toBe(0);
  });

  it("non-strict mode preserves the zod JSON schema as-is", () => {
    const js = toAnthropicInputSchema(Complex, { strict: false });
    expect(js.$schema).toBeUndefined();
    expect(findKeys(js, "oneOf")).toBeGreaterThan(0);
    expect(findKeys(js, "minItems")).toBeGreaterThan(0);
    expect(findKeys(js, "maxItems")).toBeGreaterThan(0);
  });
});

describe("AnthropicProvider", () => {
  it("uses forced tool use for structured output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(toolUse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("k", "claude-test");
    const { data } = await p.chatJSON(opts);
    expect(data.ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("k");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body);
    expect(body.tool_choice).toEqual({ type: "tool", name: "pact_response" });
    expect(body.tools[0].strict).toBe(true);
    expect(body.tools[0].input_schema.$schema).toBeUndefined();
  });

  it("does one text-mode repair turn on invalid tool input", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toolUse({ ok: "nope" }))
      .mockResolvedValueOnce(text('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("k", "claude-test");
    const { data } = await p.chatJSON(opts);
    expect(data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.tools).toBeUndefined();
  });

  it("drops strict and retries as a plain tool on strict-schema rejection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        httpError(
          400,
          '{"error":{"message":"tools.0.custom: Schema type oneOf is not supported"}}',
        ),
      )
      .mockResolvedValueOnce(toolUse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("k", "claude-test");
    const { data } = await p.chatJSON(opts);
    expect(data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.tools[0].strict).toBeUndefined();
    expect(second.tools[0].name).toBe("pact_response");
  });

  it("falls back to text mode when tool use is rejected twice (400 schema)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        httpError(400, '{"error":"invalid input_schema for tool pact_response"}'),
      )
      .mockResolvedValueOnce(
        httpError(400, '{"error":"invalid input_schema for tool pact_response"}'),
      )
      .mockResolvedValueOnce(text('Sure — {"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("k", "claude-test");
    const { data } = await p.chatJSON(opts);
    expect(data.ok).toBe(true);
    const third = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(third.tools).toBeUndefined();
  });

  it("streams input_json_delta fragments and emits answer text", async () => {
    const StreamSchema = z.object({ answer: z.string(), ok: z.boolean() });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        sse([delta('{"answer":"Hel'), delta('lo","ok":true}')]),
      );
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("k", "claude-test");
    let answer = "";
    const { data } = await p.chatJSONStream(
      { system: "s", user: "u", schema: StreamSchema, schemaName: "t" },
      (t) => (answer += t),
    );
    expect(answer).toBe("Hello");
    expect(data.ok).toBe(true);
  });

  it("rejects embeddings", async () => {
    const p = new AnthropicProvider("k", "claude-test");
    await expect(p.embed(["x"])).rejects.toThrow(/embeddings not available/);
  });
});

describe("getProvider selection", () => {
  it("prefers Anthropic when both keys are set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "ak");
    vi.stubEnv("OPENROUTER_API_KEY", "ok");
    vi.stubEnv("PACT_LLM_PROVIDER", "");
    expect(getProvider()).toBeInstanceOf(AnthropicProvider);
  });

  it("honours PACT_LLM_PROVIDER=openrouter", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "ak");
    vi.stubEnv("OPENROUTER_API_KEY", "ok");
    vi.stubEnv("PACT_LLM_PROVIDER", "openrouter");
    expect(getProvider()).toBeInstanceOf(OpenRouterProvider);
  });
});
