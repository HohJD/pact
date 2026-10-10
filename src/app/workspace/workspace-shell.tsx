"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { CompareView } from "@/components/compare/compare-view";
import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { CommandPalette } from "@/components/command-palette";
import { MapRoot } from "@/components/map/map-root";
import { OutcomesView } from "@/components/outcomes/outcomes-view";
import { ResultsView } from "@/components/results/results-view";
import { TimelineView } from "@/components/timeline/timeline-view";
import { TransferView } from "@/components/transfer/transfer-view";
import { RightPanel } from "@/components/panel/right-panel";
import { FilterSidebar } from "@/components/workspace/filter-sidebar";
import { AppHeader } from "@/components/app-header";
import { useDataset } from "@/components/providers/dataset-provider";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { parseWorkspaceParams } from "@/lib/query/workspace-params";
import { cn } from "@/lib/utils";
import { useWorkspace, type WorkspaceView } from "@/store/workspace";

// expose the store for programmatic control (agent UI actions, e2e) —
// development and debug builds only
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV !== "production" ||
    new URLSearchParams(window.location.search).has("debug"))
) {
  (window as unknown as { __pact: typeof useWorkspace }).__pact = useWorkspace;
}

const VIEWS: WorkspaceView[] = [
  "RESULTS",
  "GRAPH",
  "MAP",
  "TIMELINE",
  "OUTCOMES",
];
const MOBILE_HINT_STORAGE_KEY = "pact.mobileHintDismissed";

export function WorkspaceShell() {
  const dataset = useDataset();
  const view = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const panel = useWorkspace((s) => s.panel);
  const compareIds = useWorkspace((s) => s.compareIds);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const transferRequest = useWorkspace((s) => s.transferRequest);
  const closeTransfer = useWorkspace((s) => s.closeTransfer);
  const comparing = panel === "COMPARE" && compareIds.length >= 2;

  // sidebar and panel start closed below lg — they render as overlays there.
  // isDesktop via useSyncExternalStore stays hydration-safe (server snapshot = true)
  const isDesktop = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
  const [sidebarToggled, setSidebarToggled] = useState<boolean | null>(null);
  const [panelToggled, setPanelToggled] = useState<boolean | null>(null);
  const sidebarOpen = sidebarToggled ?? isDesktop;
  const panelOpen = panelToggled ?? isDesktop;
  const setSidebarOpen = useCallback(
    (up: boolean | ((p: boolean) => boolean)) =>
      setSidebarToggled((p) => (typeof up === "function" ? up(p ?? isDesktop) : up)),
    [isDesktop],
  );
  const setPanelOpen = useCallback(
    (up: boolean | ((p: boolean) => boolean)) =>
      setPanelToggled((p) => (typeof up === "function" ? up(p ?? isDesktop) : up)),
    [isDesktop],
  );
  const [showMobileHint, setShowMobileHint] = useState(false);
  const params = useSearchParams();
  const initialised = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setShowMobileHint(
          window.localStorage.getItem(MOBILE_HINT_STORAGE_KEY) !== "true",
        );
      } catch {
        setShowMobileHint(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () =>
      useWorkspace.subscribe((s, prev) => {
        if (window.matchMedia("(min-width: 1024px)").matches) return;
        if (s.panel && (s.panel !== prev.panel || s.selection !== prev.selection)) {
          setPanelToggled(true);
          setSidebarToggled(false);
        }
      }),
    [],
  );

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const q = params.get("q");
    const v = params.get("view")?.toUpperCase();
    const link = parseWorkspaceParams(params, dataset);
    if (link.policyId) {
      if (!v) setView("GRAPH");
      select({ kind: "policy", id: link.policyId });
      openPanel("DETAILS");
    }
    for (const id of link.compareIds) toggleCompare(id);
    if (link.compareIds.length >= 2) openPanel("COMPARE");
    // submitAnalystQuestion flips to RESULTS synchronously, so an explicit
    // ?view= deep link must be applied afterwards to win
    if (q) void submitAnalystQuestion(q, dataset);
    if (v && VIEWS.includes(v as WorkspaceView)) setView(v as WorkspaceView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissMobileHint = () => {
    setShowMobileHint(false);
    try {
      window.localStorage.setItem(MOBILE_HINT_STORAGE_KEY, "true");
    } catch {
      setShowMobileHint(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = useWorkspace.getState();
      if (e.key === "Escape") {
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
      if (e.key >= "1" && e.key <= "5") {
        const i = Number(e.key) - 1;
        if (VIEWS[i]) s.setView(VIEWS[i]);
      }
      if (e.key === "[") setSidebarOpen((v) => !v);
      if (e.key === "]") setPanelOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, openPanel, setSidebarOpen, setPanelOpen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader
        variant="workspace"
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      {showMobileHint && (
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground lg:hidden">
          <p className="min-w-0 flex-1 leading-snug">
            Best on a larger screen — on phones some views are simplified.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissMobileHint}
            className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-accent hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && !isDesktop && (
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 z-20 bg-black/40 lg:hidden"
          />
        )}
        {sidebarOpen && <FilterSidebar />}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 scrollbar-thin">
            <div className="inline-flex gap-0.5 rounded-lg bg-secondary/60 p-0.5">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    // tabs always land on the chosen view, even from compare/transfer
                    if (transferRequest) closeTransfer();
                    if (comparing) openPanel(null);
                    setView(v);
                  }}
                  aria-pressed={view === v && !comparing && !transferRequest}
                  className={cn(
                    "rounded-md px-3 py-1 font-mono text-[10px] tracking-wider transition-colors",
                    view === v && !comparing && !transferRequest
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {compareIds.length > 0 && !comparing && !transferRequest && (
              <CompareTray
                count={compareIds.length}
                onOpen={() => openPanel("COMPARE")}
                onClear={() => compareIds.forEach(toggleCompare)}
              />
            )}
          </div>
          <div className="min-h-0 flex-1">
            {transferRequest ? (
              <TransferView />
            ) : comparing ? (
              <CompareView />
            ) : view === "RESULTS" ? (
              <ResultsView />
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
        <RightPanel
          open={panelOpen && !comparing}
          onClose={() => {
            if (!isDesktop) setPanelOpen(false);
          }}
        />
        <EvidenceDrawer />
        <CommandPalette />
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

/** Shows what's queued for comparison and the way into it. */
function CompareTray({
  count,
  onOpen,
  onClear,
}: {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
      <button
        type="button"
        onClick={onOpen}
        disabled={count < 2}
        title={count < 2 ? "Add one more policy to compare" : undefined}
        className="rounded border border-entity-policy/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-entity-policy transition-colors hover:bg-entity-policy/10 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {count < 2 ? "Compare 1/2" : `Compare ${count} →`}
      </button>
      <button
        type="button"
        aria-label="Clear comparison"
        onClick={onClear}
        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
