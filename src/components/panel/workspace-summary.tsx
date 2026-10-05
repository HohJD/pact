"use client";

import { useMemo } from "react";

import { useDataset } from "@/components/providers/dataset-provider";
import { SeedRepository } from "@/lib/data/seed-repository";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "./section-title";

const ENTITY_BAR: Record<string, string> = {
  country: "#9B7BFF",
  mechanism: "#FF9A3D",
};

export function WorkspaceSummary() {
  const dataset = useDataset();
  const filters = useWorkspace((s) => s.filters);

  const policies = useMemo(() => {
    const repo = new SeedRepository(dataset);
    const { evidence_strength_min, ...rest } = filters;
    let ps = repo.listPolicies(rest);
    if (evidence_strength_min) {
      ps = ps.filter((p) => repo.getEvidenceStrength(p.id).score >= evidence_strength_min);
    }
    return ps;
  }, [dataset, filters]);

  const countBy = (fn: (p: (typeof policies)[number]) => string) => {
    const m = new Map<string, number>();
    for (const p of policies) m.set(fn(p), (m.get(fn(p)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byCountry = countBy((p) => p.country_code);
  const mechName = new Map(dataset.mechanisms.map((m) => [m.id, m.name]));
  const mechCounts = new Map<string, number>();
  for (const p of policies)
    for (const mid of p.mechanism_ids)
      mechCounts.set(mid, (mechCounts.get(mid) ?? 0) + 1);
  const byMechanism = [...mechCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="pr-9">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
          Workspace summary
        </h2>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {policies.length} policies in view
        </p>
      </div>

      <SectionTitle>By country</SectionTitle>
      <Bars rows={byCountry.map(([k, v]) => [k, v])} color={ENTITY_BAR.country} />

      <SectionTitle>By mechanism</SectionTitle>
      <Bars
        rows={byMechanism.map(([k, v]) => [mechName.get(k) ?? k, v])}
        color={ENTITY_BAR.mechanism}
      />
    </div>
  );
}

function Bars({ rows, color }: { rows: Array<[string, number]>; color: string }) {
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <div className="space-y-1">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-20 truncate font-mono text-[9px] text-muted-foreground">
            {label}
          </span>
          <div className="h-1.5 flex-1 rounded bg-secondary">
            <div
              className="h-full rounded"
              style={{ width: `${(v / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-6 text-right font-mono text-[9px] text-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}
