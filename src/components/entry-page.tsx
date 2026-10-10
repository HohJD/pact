"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Sparkles } from "lucide-react";

import { storeLastQuery } from "@/components/back-to-results";
import { useDataset } from "@/components/providers/dataset-provider";

const EXAMPLES = [
  "Which policies accelerated heat-pump adoption?",
  "heat pump grants",
  "insulation subsidies for low-income households",
  "building energy codes",
];

export function EntryPage() {
  const router = useRouter();
  const dataset = useDataset();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (q = input) => {
    const t = q.trim();
    if (!t) return;
    setInput(t);
    storeLastQuery(t);
    router.push(`/workspace?q=${encodeURIComponent(t)}`);
  };

  // "/" focuses the input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(76,141,255,0.10),transparent_60%)]"
      />
      <div className="relative w-full max-w-xl">
        <h1 className="text-center text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">
          What has actually worked?
        </h1>
        <p className="mt-3 text-center text-[14px] text-muted-foreground">
          Connect climate policies to each other and to the evidence of what
          happened after.
        </p>
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex h-14 w-full items-center gap-2.5 rounded-xl border border-border bg-card/60 px-4 focus-within:border-entity-policy/60 focus-within:shadow-[0_0_0_3px_rgba(76,141,255,0.15)]">
            <Sparkles className="size-4 shrink-0 text-entity-policy" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or search climate policies…"
              autoFocus
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => submit(e)}
                className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-entity-policy/50 hover:text-foreground"
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {dataset.policies.length} policies · {dataset.evidence.length}{" "}
          evidence records · {dataset.jurisdictions.length} jurisdictions
        </p>
      </div>
    </div>
  );
}
