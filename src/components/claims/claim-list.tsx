"use client";

import type { Claim } from "@/lib/domain/schema";
import { useDataset } from "@/components/providers/dataset-provider";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const INFERENCE_STYLE: Record<string, string> = {
  DIRECTLY_SUPPORTED: "border-entity-outcome/40 bg-entity-outcome/15 text-entity-outcome",
  SYNTHESISED: "border-entity-policy/40 bg-entity-policy/15 text-entity-policy",
  INFERRED: "border-entity-evidence/40 bg-entity-evidence/15 text-entity-evidence",
  UNCERTAIN: "border-border bg-secondary text-muted-foreground",
};

const CONFIDENCE_DOTS: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Generic claim renderer — used for computed lessons now and analyst LLM
 * output later. Citations are numbered evidence chips that open the drawer.
 */
export function ClaimList({ claims }: { claims: Claim[] }) {
  const dataset = useDataset();
  const openEvidence = useWorkspace((s) => s.openEvidence);

  // stable citation numbering across the whole list
  const citationIndex = new Map<string, number>();
  let counter = 0;
  for (const c of claims)
    for (const id of c.evidence_ids)
      if (!citationIndex.has(id)) citationIndex.set(id, ++counter);

  return (
    <ul className="space-y-2">
      {claims.map((c, i) => (
        <li key={i} className="rounded border border-border/60 p-2.5">
          <p className="text-[11.5px] leading-snug text-foreground">{c.text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
                INFERENCE_STYLE[c.inference_type],
              )}
            >
              {c.inference_type.replace(/_/g, " ")}
            </span>
            <span className="flex items-center gap-0.5" title={`Confidence: ${c.confidence}`}>
              {[1, 2, 3].map((d) => (
                <span
                  key={d}
                  className="size-1 rounded-full"
                  style={{
                    backgroundColor:
                      d <= (CONFIDENCE_DOTS[c.confidence] ?? 0) ? "#8B919A" : "#3a3d44",
                  }}
                />
              ))}
            </span>
            {c.evidence_ids.map((id) => {
              const ev = dataset.evidence.find((e) => e.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openEvidence(id)}
                  title={ev ? `${ev.title} — ${ev.publisher}` : id}
                  className="rounded border border-entity-evidence/40 px-1 font-mono text-[8px] text-entity-evidence hover:bg-entity-evidence/10"
                >
                  [{citationIndex.get(id)}]
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
