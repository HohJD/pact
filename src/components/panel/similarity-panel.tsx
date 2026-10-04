"use client";

import { Button } from "@/components/ui/button";
import { useDataset } from "@/components/providers/dataset-provider";
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

  const rows: Array<[string, boolean | string]> = [
    ["Mechanism", bd.same_mechanism],
    ["Technology", bd.same_technology],
    ["Target", bd.same_target],
    ["Sector", bd.same_sector],
    ["Jurisdiction", bd.jurisdiction_similarity],
  ];

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
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
      <dl className="space-y-1">
        {rows.map(([label, v]) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "font-mono text-[10px]",
                v === true || v === "HIGH"
                  ? "text-entity-outcome"
                  : v === "MEDIUM"
                    ? "text-entity-evidence"
                    : "text-muted-foreground",
              )}
            >
              {typeof v === "boolean" ? (v ? "✓ same" : "△ different") : v}
            </dd>
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
