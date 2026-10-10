"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Sparkles } from "lucide-react";

import { storeLastQuery } from "@/components/back-to-results";

const EXAMPLES = [
  "Which policies accelerated heat-pump adoption?",
  "heat pump grants",
  "insulation subsidies for low-income households",
  "building energy codes",
];

export function EntryPage() {
  const router = useRouter();
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
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">
      <div className="w-full max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex w-full items-center gap-2.5 rounded-md border border-border bg-secondary/60 px-4 py-3">
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
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          Connect climate policies to each other and to the evidence of what
          happened after.
        </p>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => submit(e)}
                className="rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-entity-policy/50 hover:text-entity-policy"
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
