"use client";

import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "./section-title";

/** Shared panel for mechanism and technology selections. */
export function EntityPanel({ kind, id }: { kind: "mechanism" | "technology"; id: string }) {
  const dataset = useDataset();
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  const entity =
    kind === "mechanism"
      ? dataset.mechanisms.find((m) => m.id === id)
      : dataset.technologies.find((t) => t.id === id);
  if (!entity) return null;

  const policies = dataset.policies.filter((p) =>
    kind === "mechanism" ? p.mechanism_ids.includes(id) : p.technology_ids.includes(id),
  );

  const byCountry = new Map<string, typeof policies>();
  for (const p of policies) {
    if (!byCountry.has(p.country_code)) byCountry.set(p.country_code, []);
    byCountry.get(p.country_code)!.push(p);
  }

  const color = kind === "mechanism" ? "#FF9A3D" : "#2FD3E6";

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="pr-9">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {kind}
        </span>
      </div>
      <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
        {entity.name}
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">{entity.description}</p>

      <SectionTitle>{policies.length} policies</SectionTitle>
      <div className="space-y-2">
        {[...byCountry.entries()].map(([cc, ps]) => (
          <div key={cc}>
            <div className="font-mono text-[9px] text-entity-jurisdiction">{cc}</div>
            <ul className="mt-0.5 space-y-0.5">
              {ps.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select({ kind: "policy", id: p.id });
                      openPanel("DETAILS");
                    }}
                    className="w-full truncate rounded px-1.5 py-1 text-left text-[11px] text-foreground hover:bg-secondary"
                  >
                    {p.short_name ?? p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
