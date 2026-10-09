"use client";

import { useEffect, useRef, useState } from "react";

import type { AnalystResponse } from "@/lib/domain/schema";
import { ClaimList } from "@/components/claims/claim-list";
import { cn } from "@/lib/utils";

interface StreamResult {
  data: AnalystResponse & { model?: string };
  offline: boolean;
}

/** Read the /api/analyst/stream SSE body — same event contract as client.ts,
 * without the workspace-store side effects. */
async function readStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (t: string) => void,
): Promise<StreamResult | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: (AnalystResponse & { model?: string }) | null = null;
  let offline = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop() ?? "";
    for (const ev of events) {
      const event = ev
        .split("\n")
        .find((l) => l.startsWith("event:"))
        ?.slice(6)
        .trim();
      const dataLine = ev
        .split("\n")
        .find((l) => l.startsWith("data:"))
        ?.slice(5);
      if (!event || !dataLine) continue;
      const payload = JSON.parse(dataLine);
      if (event === "delta") onDelta(payload.text ?? "");
      else if (event === "final") result = payload;
      else if (event === "fallback") {
        result = payload;
        offline = true;
      }
    }
  }
  return result ? { data: result, offline } : null;
}

export function AnalystSummary({ query }: { query: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<StreamResult | null>(null);
  const [err, setErr] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/analyst/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const r = await readStream(res.body, (t) => {
          if (seq.current === id) setText((s) => s + t);
        });
        if (seq.current === id && r) setResult(r);
      } catch {
        if (seq.current === id && !controller.signal.aborted) setErr(true);
      }
    })();
    return () => controller.abort();
  }, [query]);

  const data = result?.data;
  const chip = data
    ? result!.offline
      ? "CURATED"
      : `LIVE · ${data.model ?? "model"}`
    : null;

  return (
    <div className="rounded border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Analyst
        </span>
        {chip ? (
          <span
            className={cn(
              "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
              result?.offline
                ? "border-border bg-secondary text-muted-foreground"
                : "border-entity-outcome/40 bg-entity-outcome/15 text-entity-outcome",
            )}
          >
            {chip}
          </span>
        ) : (
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
            {err ? "unavailable" : "…"}
          </span>
        )}
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap text-[11.5px] leading-snug text-foreground",
          !expanded && "line-clamp-[12]",
        )}
      >
        {data?.answer ?? text ?? ""}
        {!data && !err && !text && (
          <span className="text-muted-foreground">Thinking…</span>
        )}
        {err && (
          <span className="text-muted-foreground">
            Analyst unavailable — the ranked list below still works.
          </span>
        )}
      </p>
      {data && data.answer.length > 800 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[10px] text-entity-policy hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      {data?.claims?.length ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowClaims((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {data.claims.length} evidence-backed claims ·{" "}
            {showClaims ? "Hide" : "Show"}
          </button>
          {showClaims && (
            <div className="mt-1.5">
              <ClaimList claims={data.claims} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
