/** SSE + incremental JSON-field streaming helpers for the analyst route. */

/**
 * Async iterator over an SSE response body — yields each `data:` payload.
 * Handles events split across network chunks. Stops at `data: [DONE]`.
 */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() ?? "";
      for (const ev of events) {
        for (const line of ev.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          if (payload) yield payload;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const KEY_RE = /"answer"\s*:\s*"/;

/**
 * Incrementally extracts the contents of the top-level `"answer"` string field
 * from a JSON document arriving in chunks, emitting displayable text as it
 * arrives. Handles JSON string escapes (\n, \", \\, \uXXXX); a trailing partial
 * escape waits for the next chunk.
 */
export function createAnswerExtractor(onDelta: (text: string) => void) {
  let buf = "";
  let started = false;
  let done = false;
  let pos = 0;

  return function feed(chunk: string): void {
    if (done) return;
    buf += chunk;

    if (!started) {
      const m = KEY_RE.exec(buf);
      if (!m) {
        // the key may span a chunk boundary — keep a tail only
        if (buf.length > 24) buf = buf.slice(-24);
        return;
      }
      started = true;
      pos = m.index + m[0].length;
    }

    let out = "";
    let i = pos;
    for (; i < buf.length; i++) {
      const c = buf[i];
      if (c === '"') {
        done = true;
        break;
      }
      if (c === "\\") {
        if (i + 1 >= buf.length) break; // partial escape — wait for more
        const e = buf[++i];
        if (e === "u") {
          if (i + 4 >= buf.length) {
            i--; // partial \uXXXX — wait
            break;
          }
          out += String.fromCharCode(parseInt(buf.slice(i + 1, i + 5), 16));
          i += 4;
        } else {
          out += e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : e;
        }
        continue;
      }
      out += c;
    }
    pos = i;
    if (out) onDelta(out);
  };
}

/** Serialize one SSE frame. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
