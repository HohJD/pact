"use client";

import {
  useDataset,
  useRepo,
} from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { InferenceChip } from "./inference-chip";
import { SectionTitle } from "./section-title";

export function OutcomesPanel({ policyId }: { policyId?: string }) {
  const repo = useRepo();
  const dataset = useDataset();
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const openEvidence = useWorkspace((s) => s.openEvidence);

  const outcomes = policyId
    ? repo.getOutcomesForPolicy(policyId)
    : dataset.outcomes;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-entity-evidence/30 bg-entity-evidence/10 px-3 py-1.5 pr-9 text-[9.5px] text-entity-evidence lg:pr-3">
        Correlation ≠ causation. Inference labels reflect what the cited evidence supports.
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <SectionTitle>{outcomes.length} outcomes</SectionTitle>
        {outcomes.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No outcomes recorded for this policy.</p>
        )}
        <ul className="space-y-2">
          {outcomes.map((o) => {
            const cited = o.evidence_ids
              .map((id) => dataset.evidence.find((e) => e.id === id))
              .filter(Boolean);
            const policy = dataset.policies.find((p) => p.id === o.policy_id);
            return (
              <li key={o.id} className="rounded border border-border/60 p-2">
                {!policyId && policy && (
                  <button
                    type="button"
                    onClick={() => {
                      select({ kind: "policy", id: policy.id });
                      openPanel("DETAILS");
                    }}
                    className="mb-1 font-mono text-[9px] uppercase tracking-wider text-entity-policy hover:underline"
                  >
                    {policy.short_name ?? policy.name}
                  </button>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] leading-snug text-foreground">{o.headline}</p>
                  <InferenceChip inference={o.inference} />
                </div>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  {o.magnitude ? `${o.magnitude} · ` : ""}
                  {o.period}
                </p>
                {o.note && <p className="mt-1 text-[10px] text-muted-foreground">{o.note}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {cited.map(
                    (e) =>
                      e && (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => openEvidence(e.id)}
                          className="rounded border border-entity-evidence/30 px-1 font-mono text-[8px] text-entity-evidence hover:bg-entity-evidence/10"
                        >
                          {e.publisher}
                        </button>
                      ),
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
