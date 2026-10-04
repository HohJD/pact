"use client";

import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "./section-title";

export function JurisdictionPanel({ jurisdictionId }: { jurisdictionId: string }) {
  const dataset = useDataset();
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const focusCountry = useWorkspace((s) => s.focusCountry);
  const openTransfer = useWorkspace((s) => s.openTransfer);
  const compareIds = useWorkspace((s) => s.compareIds);
  const j = dataset.jurisdictions.find((x) => x.id === jurisdictionId);
  if (!j) return null;

  const policies = dataset.policies.filter((p) => p.jurisdiction_id === j.id);
  const c = j.context;

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <span className="rounded bg-entity-jurisdiction/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-entity-jurisdiction">
        {j.level}
      </span>
      <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">{j.name}</h2>

      {(c.dominant_heating || c.owner_occupier_share || c.electricity_gas_price_ratio) && (
        <>
          <SectionTitle>Context</SectionTitle>
          <dl className="space-y-1.5">
            {c.dominant_heating && <Row k="Dominant heating" v={c.dominant_heating} />}
            {c.owner_occupier_share !== undefined && (
              <Row k="Owner-occupier share" v={`${Math.round(c.owner_occupier_share * 100)}%`} />
            )}
            {c.electricity_gas_price_ratio !== undefined && (
              <Row k="Electricity/gas price ratio" v={`~${c.electricity_gas_price_ratio}`} />
            )}
            {c.heat_pump_stock_per_1000_households !== undefined && (
              <Row k="HP stock / 1000 households" v={String(c.heat_pump_stock_per_1000_households)} />
            )}
          </dl>
          {c.housing_stock_note && (
            <p className="mt-2 text-[11px] text-muted-foreground">{c.housing_stock_note}</p>
          )}
        </>
      )}

      <SectionTitle>{policies.length} policies</SectionTitle>
      <ul className="space-y-0.5">
        {policies.map((p) => (
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

      <button
        type="button"
        onClick={() => focusCountry(j.country_code)}
        className="mt-3 w-full rounded border border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
      >
        Focus on map
      </button>
      <button
        type="button"
        onClick={() =>
          openTransfer({
            target_jurisdiction_id: j.id,
            source_policy_ids: compareIds,
          })
        }
        className="mt-1.5 w-full rounded border border-entity-jurisdiction/40 px-2 py-1.5 text-[10px] text-entity-jurisdiction hover:bg-entity-jurisdiction/10"
      >
        Policy transfer — what could {j.name} learn?
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono text-foreground">{v}</dd>
    </div>
  );
}
