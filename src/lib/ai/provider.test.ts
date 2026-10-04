import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { OpenRouterProvider } from "./provider";

const Schema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}
function chat(content: string) {
  return jsonResponse({ choices: [{ message: { content } }] });
}
function httpError(status: number, body: string) {
  return new Response(body, { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenRouterProvider response_format ladder", () => {
  it("uses json_schema first when supported", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chat('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const p = new OpenRouterProvider("k", "m:test");
    const { data } = await p.chatJSON({
      system: "s",
      user: "u",
      schema: Schema,
      schemaName: "t",
    });
    expect(data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format.type).toBe("json_schema");
  });

  it("falls back to json_object when json_schema is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpError(400, '{"error":"response_format json_schema not supported"}'))
      .mockResolvedValueOnce(chat('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const p = new OpenRouterProvider("k", "m:test");
    const { data } = await p.chatJSON({
      system: "s",
      user: "u",
      schema: Schema,
      schemaName: "t",
    });
    expect(data.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.response_format.type).toBe("json_object");
  });

  it("falls back to plain text and extracts the first JSON block", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpError(400, '{"error":"response_format unsupported"}'))
      .mockResolvedValueOnce(httpError(400, '{"error":"response_format not supported"}'))
      .mockResolvedValueOnce(chat('Sure! Here is the JSON: {"ok":true} — done.'));
    vi.stubGlobal("fetch", fetchMock);
    const p = new OpenRouterProvider("k", "m:test");
    const { data } = await p.chatJSON({
      system: "s",
      user: "u",
      schema: Schema,
      schemaName: "t",
    });
    expect(data.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.response_format).toBeUndefined();
  });

  it("throws LLMOutputError when all formats fail validation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpError(400, '{"error":"response_format unsupported"}'))
      .mockResolvedValue(chat("not json at all"));
    vi.stubGlobal("fetch", fetchMock);
    const p = new OpenRouterProvider("k", "m:test");
    await expect(
      p.chatJSON({ system: "s", user: "u", schema: Schema, schemaName: "t" }),
    ).rejects.toThrow();
  });
});
