"use client";

import { useState } from "react";

import { Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { resolveQuery } from "@/lib/query/resolve";
import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";

export function TopBar() {
  const dataset = useDataset();
  const query = useWorkspace((s) => s.query);
  const setQuery = useWorkspace((s) => s.setQuery);
  const patchFilters = useWorkspace((s) => s.patchFilters);
  const highlight = useWorkspace((s) => s.highlight);
  const saveCurrentSearch = useWorkspace((s) => s.saveCurrentSearch);
  const [draft, setDraft] = useState<string | null>(null);

  const run = () => {
    const q = (draft ?? query).trim();
    setDraft(null);
    setQuery(q);
    if (!q) return;
    const resolved = resolveQuery(q, dataset);
    patchFilters(resolved.filters);
    highlight([
      ...resolved.highlightTechnologyIds,
      ...dataset.jurisdictions
        .filter((j) => resolved.highlightCountries.includes(j.country_code))
        .map((j) => j.id),
    ]);
    saveCurrentSearch();
  };

  return (
    <header className="flex h-10 shrink-0 items-center gap-4 border-b border-border bg-card px-3">
      <span className="font-mono text-[13px] font-semibold tracking-[0.25em] text-foreground">
        PACT
      </span>
      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={draft ?? query}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            onBlur={() => draft !== null && run()}
            placeholder="Ask about policies, technologies, jurisdictions…"
            className="w-full bg-transparent text-dense text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          title="Command palette"
        >
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
