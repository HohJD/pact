"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { CompareView } from "@/components/compare/compare-view";
import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { CommandPalette } from "@/components/command-palette";
import { MapRoot } from "@/components/map/map-root";
import { OutcomesView } from "@/components/outcomes/outcomes-view";
import { TimelineView } from "@/components/timeline/timeline-view";
import { TransferView } from "@/components/transfer/transfer-view";
import { RightPanel } from "@/components/panel/right-panel";
import { FilterSidebar } from "@/components/workspace/filter-sidebar";
import { TopBar } from "@/components/workspace/topbar";
import { useDataset } from "@/components/providers/dataset-provider";
import { submitAnalystQuestion } from "@/lib/ai/client";
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
const DEMO_QUESTION =
  "Which policies have successfully accelerated heat-pump adoption?";

const DEMO_STEPS = [
  "Open /demo — the heat-pump scenario loads by itself (curated, no network).",
  "Read the analyst answer in the right panel.",
  "Click a citation [n] → the evidence drawer opens.",
  "Esc closes it; browse the graph — nodes highlighted by the answer.",
  "Select BUS, BEG 2024 and MaPrimeRénov' (⌘K or right-click → compare).",
  "Open the comparison — shared-row table, key differences, cited lessons.",
  "SHOW OUTCOMES → time series with policy markers.",
  "MAP → click Germany → focus + zoom; back to GRAPH.",
  "TIMELINE → country lanes; click a bar to select.",
  "Ask “What could the UK learn from Germany?” in the command bar.",
  "Open Policy transfer from a policy card (Oxford ← BEG).",
  "⌘K → search evidence, open the drawer.",
];

export function WorkspaceShell({ demo = false }: { demo?: boolean }) {
  const dataset = useDataset();
  const view = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const panel = useWorkspace((s) => s.panel);
  const compareIds = useWorkspace((s) => s.compareIds);
  const transferRequest = useWorkspace((s) => s.transferRequest);
  const comparing = panel === "COMPARE" && compareIds.length >= 2;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [scriptOpen, setScriptOpen] = useState(false);
  const params = useSearchParams();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (demo) {
      void submitAnalystQuestion(DEMO_QUESTION, dataset, { demo: true });
      return;
    }
    const q = params.get("q");
    const v = params.get("view")?.toUpperCase();
    if (v && VIEWS.includes(v as WorkspaceView)) setView(v as WorkspaceView);
    if (q) void submitAnalystQuestion(q, dataset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = useWorkspace.getState();
      if (e.key === "Escape") {
        if (scriptOpen) {
          setScriptOpen(false);
          return;
        }
        // drawer first, then selection/panel
        if (s.evidenceDrawerId) {
          s.closeEvidence();
          return;
        }
        select(null);
        openPanel(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setPaletteOpen(true);
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("pact-command-input")?.focus();
      }
      if (e.key === "?") {
        if (demo) setScriptOpen((v) => !v);
      }
      if (e.key >= "1" && e.key <= "4") {
        const i = Number(e.key) - 1;
        if (VIEWS[i]) s.setView(VIEWS[i]);
      }
      if (e.key === "[") setSidebarOpen((v) => !v);
      if (e.key === "]") setPanelOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, openPanel, demo, scriptOpen]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar demo={demo} />
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && <FilterSidebar />}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 scrollbar-thin">
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
            {transferRequest ? (
              <TransferView />
            ) : comparing ? (
              <CompareView />
            ) : view === "GRAPH" ? (
              <GraphCanvas />
            ) : view === "OUTCOMES" ? (
              <OutcomesView />
            ) : view === "MAP" ? (
              <MapRoot />
            ) : view === "TIMELINE" ? (
              <TimelineView />
            ) : (
              <PlaceholderView name={view} />
            )}
          </div>
        </main>
        <RightPanel open={panelOpen && !comparing} />
        <EvidenceDrawer />
        <CommandPalette />
      </div>

      {/* demo script — “?” toggles it (presenter aid) */}
      {demo && (
        <button
          type="button"
          onClick={() => setScriptOpen((v) => !v)}
          className="glass fixed bottom-3 left-3 z-40 flex size-8 items-center justify-center rounded-full font-mono text-[13px] text-muted-foreground hover:text-foreground"
          aria-label="Demo script"
        >
          ?
        </button>
      )}
      {demo && scriptOpen && (
        <div className="glass fixed bottom-14 left-3 z-40 w-80 rounded-lg p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Demo script
            </span>
            <span className="kbd">?</span>
          </div>
          <ol className="space-y-1.5">
            {DEMO_STEPS.map((s, i) => (
              <li key={i} className="flex gap-2 text-[10.5px] leading-snug text-foreground">
                <span className="font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
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
