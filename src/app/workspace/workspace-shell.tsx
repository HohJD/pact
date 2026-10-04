"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { CompareView } from "@/components/compare/compare-view";
import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { OutcomesView } from "@/components/outcomes/outcomes-view";
import { RightPanel } from "@/components/panel/right-panel";
import { FilterSidebar } from "@/components/workspace/filter-sidebar";
import { TopBar } from "@/components/workspace/topbar";
import { useDataset } from "@/components/providers/dataset-provider";
import { resolveQuery } from "@/lib/query/resolve";
import { cn } from "@/lib/utils";
import { useWorkspace, type WorkspaceView } from "@/store/workspace";

// expose the store for programmatic control (agent UI actions, e2e, demos) —
// development and debug builds only
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV !== "production" ||
    new URLSearchParams(window.location.search).has("debug"))
) {
  (window as unknown as { __pact: typeof useWorkspace }).__pact = useWorkspace;
}

const VIEWS: WorkspaceView[] = ["GRAPH", "MAP", "TIMELINE", "OUTCOMES"];

export function WorkspaceShell() {
  const dataset = useDataset();
  const view = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const setQuery = useWorkspace((s) => s.setQuery);
  const setFilters = useWorkspace((s) => s.setFilters);
  const highlight = useWorkspace((s) => s.highlight);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const panel = useWorkspace((s) => s.panel);
  const compareIds = useWorkspace((s) => s.compareIds);
  const comparing = panel === "COMPARE" && compareIds.length >= 2;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const params = useSearchParams();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const q = params.get("q");
    const v = params.get("view")?.toUpperCase();
    if (v && VIEWS.includes(v as WorkspaceView)) setView(v as WorkspaceView);
    if (q) {
      setQuery(q);
      const resolved = resolveQuery(q, dataset);
      setFilters(resolved.filters);
      highlight([
        ...resolved.highlightTechnologyIds,
        ...dataset.jurisdictions
          .filter((j) => resolved.highlightCountries.includes(j.country_code))
          .map((j) => j.id),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        select(null);
        openPanel(null);
      }
      if (e.key === "[") setSidebarOpen((v) => !v);
      if (e.key === "]") setPanelOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, openPanel]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && <FilterSidebar />}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-3">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  view === v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {comparing ? (
              <CompareView />
            ) : view === "GRAPH" ? (
              <GraphCanvas />
            ) : view === "OUTCOMES" ? (
              <OutcomesView />
            ) : (
              <PlaceholderView name={view} />
            )}
          </div>
        </main>
        <RightPanel open={panelOpen} />
        <EvidenceDrawer />
      </div>
    </div>
  );
}

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="surface px-6 py-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {name}
        </p>
        <p className="mt-1 text-dense text-muted-foreground">
          This view arrives in a later phase.
        </p>
      </div>
    </div>
  );
}
