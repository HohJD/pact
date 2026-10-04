"use client";

import { ClaimList } from "@/components/claims/claim-list";
import { SectionTitle } from "./section-title";
import { Skeleton } from "@/components/ui/skeleton";
import { applyActionsSequenced, submitAnalystQuestion } from "@/lib/ai/client";
import { useDataset } from "@/components/providers/dataset-provider";
import type { UIAction } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: "border-entity-outcome/40 text-entity-outcome",
  MEDIUM: "border-entity-evidence/40 text-entity-evidence",
  LOW: "border-border text-muted-foreground",
};

const FOLLOW_UPS = [
  "Compare UK, Germany and France",
  "What could the UK learn from Germany?",
  "Show the evidence for Germany's 2024 decline",
];

function actionLabel(a: UIAction): string {
  switch (a.type) {
    case "FOCUS_COUNTRY":
      return `FOCUS_COUNTRY ${a.country}`;
    case "HIGHLIGHT_NODES":
      return `HIGHLIGHT ${a.node_ids.length} nodes`;
    case "COMPARE_POLICIES":
      return `COMPARE ${a.policy_ids.length}`;
    case "FILTER_GRAPH":
      return "FILTER_GRAPH";
    case "CHANGE_VIEW":
      return `VIEW ${a.view}`;
    case "OPEN_POLICY":
      return "OPEN_POLICY";
    case "SHOW_OUTCOMES":
      return "SHOW_OUTCOMES";
    case "SHOW_EVIDENCE":
      return "SHOW_EVIDENCE";
  }
}

export function AnalystPanel() {
  const dataset = useDataset();
  const pending = useWorkspace((s) => s.analystPending);
  const entry = useWorkspace((s) => s.analystResponse);

  if (pending && !entry)
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-24 bg-secondary" />
        <Skeleton className="h-24 w-full bg-secondary" />
        <Skeleton className="h-16 w-full bg-secondary" />
        <Skeleton className="h-16 w-full bg-secondary" />
      </div>
    );

  if (!entry)
    return (
      <div className="p-3 text-[11px] text-muted-foreground">
        Ask a question in the command bar — the analyst answers from the evidence
        in PACT, with citations and workspace actions.
      </div>
    );

  const r = entry.data;
  const answerParts = r.answer.split(/(\[\d+\])/g);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Analyst
        </span>
        <span
          className={cn(
            "rounded border px-1 font-mono text-[8px] uppercase",
            r.source === "LLM"
              ? "border-entity-policy/40 text-entity-policy"
              : "border-entity-evidence/40 text-entity-evidence",
          )}
        >
          {r.source === "LLM" ? `LIVE${entry.model ? ` · ${entry.model}` : ""}` : "CURATED RESPONSE"}
        </span>
        <span
          className={cn(
            "ml-auto rounded border px-1 font-mono text-[8px]",
            CONFIDENCE_COLOR[r.confidence],
          )}
        >
          {r.confidence}
        </span>
        {pending && (
          <span className="size-1.5 animate-pulse rounded-full bg-entity-policy" />
        )}
      </div>

      <div className="flex-1 space-y-1 p-3">
        {r.insufficient_evidence && (
          <div className="mb-2 rounded border border-entity-evidence/40 bg-entity-evidence/10 px-2.5 py-1.5 text-[10px] text-entity-evidence">
            Insufficient evidence — the response reflects what PACT actually holds.
          </div>
        )}

        <p className="text-[12px] leading-relaxed text-foreground">
          {answerParts.map((part, i) => {
            const m = part.match(/^\[(\d+)\]$/);
            if (!m) return <span key={i}>{part}</span>;
            const idx = parseInt(m[1], 10) - 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`analyst-claim-${idx}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="mx-px rounded border border-entity-evidence/40 px-0.5 font-mono text-[8px] text-entity-evidence hover:bg-entity-evidence/10"
              >
                {part}
              </button>
            );
          })}
        </p>

        {r.claims.length > 0 && (
          <>
            <SectionTitle>Claims &amp; citations</SectionTitle>
            <ClaimList claims={r.claims} anchorId={(i) => `analyst-claim-${i}`} />
          </>
        )}

        {r.actions.length > 0 && (
          <>
            <SectionTitle>Actions applied</SectionTitle>
            <div className="flex flex-wrap items-center gap-1">
              {r.actions.map((a, i) => (
                <span
                  key={i}
                  className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground"
                >
                  {actionLabel(a)}
                </span>
              ))}
              <button
                type="button"
                onClick={() => void applyActionsSequenced(r.actions, dataset)}
                className="rounded border border-entity-policy/40 px-1.5 py-0.5 font-mono text-[8px] text-entity-policy hover:bg-entity-policy/10"
              >
                Replay actions
              </button>
            </div>
          </>
        )}

        <SectionTitle>Follow up</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {FOLLOW_UPS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => void submitAnalystQuestion(f, dataset)}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-entity-policy/50 hover:text-foreground"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
