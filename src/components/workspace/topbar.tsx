"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { PanelRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";

export function TopBar({
  onToggleSidebar,
  onTogglePanel,
}: {
  onToggleSidebar?: () => void;
  onTogglePanel?: () => void;
}) {
  const dataset = useDataset();
  const query = useWorkspace((s) => s.query);
  const setQuery = useWorkspace((s) => s.setQuery);
  const analystPending = useWorkspace((s) => s.analystPending);
  const setPaletteOpen = useWorkspace((s) => s.setPaletteOpen);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = () => {
    const q = (draft ?? query).trim();
    setDraft(null);
    if (!q) {
      setQuery("");
      return;
    }
    void submitAnalystQuestion(q, dataset);
  };

  return (
    <header className="relative flex h-10 shrink-0 items-center gap-4 border-b border-border bg-card px-3">
      <Link
        href="/"
        aria-label="PACT home"
        className="font-mono text-[13px] font-semibold tracking-[0.25em] text-foreground transition-colors hover:text-muted-foreground max-sm:hidden"
      >
        PACT
      </Link>
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground max-lg:p-2 lg:hidden"
        aria-label="Filters"
      >
        <SlidersHorizontal className="size-3.5" />
      </button>
      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1">
          <Sparkles className="size-3.5 text-entity-policy" />
          <input
            ref={inputRef}
            id="pact-command-input"
            value={draft ?? query}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="Ask the analyst… e.g. Which policies accelerated heat-pump adoption?"
            className="w-full bg-transparent text-dense text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Search
        </Link>
        <button
          type="button"
          onClick={onTogglePanel}
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground max-lg:p-2 lg:hidden"
          aria-label="Panel"
        >
          <PanelRight className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground max-lg:p-2"
          aria-label="Search"
          title="Command palette"
        >
          <span className="kbd max-sm:hidden">⌘</span>
          <span className="kbd max-sm:hidden">K</span>
          <Search className="size-3.5 sm:hidden" />
        </button>
        <ThemeToggle />
      </div>
      {analystPending && (
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="h-full w-1/3 animate-[analyst-slide_1.1s_ease-in-out_infinite] bg-entity-policy" />
        </div>
      )}
    </header>
  );
}
