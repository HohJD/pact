import { describe, expect, it } from "vitest";

import { createAnswerExtractor, parseSSE } from "./streaming";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

describe("parseSSE", () => {
  it("yields data payloads across split chunks", async () => {
    const body = streamOf([
      'data: {"a":1}\n\nda',
      'ta: {"b":2}\n',
      "\ndata: [DONE]\n\ndata: never\n\n",
    ]);
    const out: string[] = [];
    for await (const p of parseSSE(body)) out.push(p);
    expect(out).toEqual(['{"a":1}', '{"b":2}']);
  });
});

describe("createAnswerExtractor", () => {
  it("streams the answer field content incrementally", () => {
    const got: string[] = [];
    const feed = createAnswerExtractor((t) => got.push(t));
    feed('{"answer":"Hello, ');
    feed('world.');
    feed(' More","claims":[]}');
    expect(got.join("")).toBe("Hello, world. More");
  });

  it("unescapes JSON string escapes", () => {
    const got: string[] = [];
    const feed = createAnswerExtractor((t) => got.push(t));
    feed('{"answer":"say \\"hi\\"\\nsecond\\\\line\\u0041","x":1}');
    expect(got.join("")).toBe('say "hi"\nsecond\\lineA');
  });

  it("handles a key split across chunks and a partial escape", () => {
    const got: string[] = [];
    const feed = createAnswerExtractor((t) => got.push(t));
    feed('{"ans');
    feed('wer":"AB\\');
    feed('nC"}');
    expect(got.join("")).toBe("AB\nC");
  });

  it("emits nothing for JSON without an answer key", () => {
    const got: string[] = [];
    const feed = createAnswerExtractor((t) => got.push(t));
    feed('{"claims":[],"other":"value"}');
    expect(got.join("")).toBe("");
  });
});
