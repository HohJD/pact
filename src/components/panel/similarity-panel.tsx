"use client";

import { Button } from "@/components/ui/button";
import { useDataset } from "@/components/providers/dataset-provider";
import { explainSimilarity } from "@/lib/similarity/engine";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "./section-title";

/** Panel for a selected SIMILAR_TO edge (selection.id = edge id "e_sim_…"). */
export function SimilarityPanel({ edgeId }: { edgeId: string }) {
  const dataset = useDataset();
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const openPanel = useWorkspace((s) => s.openPanel);
  const select = useWorkspace((s) => s.select);

  const simId = edgeId.replace(/^e_/, "");
  const sim = dataset.similarities.find((s) => s.id === simId);
  if (!sim) return <div className="p-3 text-[11px] text-muted-foreground">Similarity not found.</div>;

  const a = dataset.policies.find((p) => p.id === sim.policy_a);
  const b = dataset.policies.find((p) => p.id === sim.policy_b);
  const bd = sim.breakdown;
  const pct = Math.round(bd.overall * 100);
  const rows = explainSimilarity(sim, dataset);

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="pr-9 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground lg:pr-3">
        {pct}% match — why these policies are similar
      </div>
      <div className="mt-2 space-y-1">
        {[a, b].map(
          (p) =>
            p && (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  select({ kind: "policy", id: p.id });
                  openPanel("DETAILS");
                }}
                className="block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium text-foreground hover:bg-secondary"
              >
                {p.name}
              </button>
            ),
        )}
      </div>

      <SectionTitle>Structure</SectionTitle>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="text-[11px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd
                className={cn(
                  "font-mono text-[10px]",
                  r.status === "same"
                    ? "text-entity-outcome"
                    : "text-muted-foreground",
                )}
              >
                {r.status === "same"
                  ? "✓ same"
                  : r.status === "partial"
                    ? "△ partially"
                    : "△ different"}
              </dd>
            </div>
            <p className="text-[9.5px] leading-snug text-muted-foreground/70">
              {r.detail}
            </p>
          </div>
        ))}
      </dl>

      {bd.differences.length > 0 && (
        <>
          <SectionTitle>Differences</SectionTitle>
          <ul className="space-y-1">
            {bd.differences.map((d, i) => (
              <li key={i} className="text-[11px] text-foreground">· {d}</li>
            ))}
          </ul>
        </>
      )}

      <Button
        className="mt-4 w-full"
        onClick={() => {
          toggleCompare(sim.policy_a);
          toggleCompare(sim.policy_b);
          openPanel("COMPARE");
        }}
      >
        Compare policies
      </Button>
    </div>
  );
}
