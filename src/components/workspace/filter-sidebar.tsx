"use client";

import { useMemo, useState, type ReactNode } from "react";

import { ChevronDown, X } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { resolveQuery } from "@/lib/query/resolve";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { useDataset } from "@/components/providers/dataset-provider";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

function Section({
  title,
  count,
  onClear,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  onClear?: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded bg-secondary px-1 font-mono text-[9px] text-foreground">
              {count}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {onClear && count !== undefined && count > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-[9px] lowercase tracking-normal hover:text-foreground"
            >
              clear
            </span>
          )}
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open && <div className="mt-2 flex flex-wrap gap-1">{children}</div>}
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-[3px] font-mono text-[11px] transition-colors",
        active
          ? "border-transparent"
          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
      style={
        active && color
          ? {
              backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              color,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

const STATUS_OPTIONS = ["ACTIVE", "ANNOUNCED", "CLOSED", "SUPERSEDED", "PAUSED"] as const;

export function FilterSidebar() {
  const dataset = useDataset();
  const query = useWorkspace((s) => s.query);
  const filters = useWorkspace((s) => s.filters);
  const patchFilters = useWorkspace((s) => s.patchFilters);
  const savedSearches = useWorkspace((s) => s.savedSearches);
  const removeSavedSearch = useWorkspace((s) => s.removeSavedSearch);

  const intent = useMemo(
    () => (query.trim() ? resolveQuery(query, dataset).intent : null),
    [query, dataset],
  );

  const toggleIn = (key: "countries" | "technology_ids" | "mechanism_ids", id: string) => {
    const cur = new Set((filters[key] as string[] | undefined) ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    patchFilters({ [key]: cur.size ? [...cur] : undefined });
  };

  const yearFrom = filters.year_from ?? 2005;
  const yearTo = filters.year_to ?? 2025;

  // country-level jurisdictions only; sub-national roll up under their country
  const jurisdictionChips = dataset.jurisdictions.filter(
    (j) => j.level === "NATIONAL" || j.level === "SUPRANATIONAL",
  );

  const importedCount = useMemo(
    () => dataset.policies.filter((p) => p.data_status === "IMPORTED").length,
    [dataset],
  );

  return (
    <aside className="flex w-[272px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card scrollbar-thin max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-2xl">
      <Section title="Current query">
        {query ? (
          <div className="w-full">
            <p className="text-dense text-foreground">{query}</p>
            {intent && (
              <span className="mt-1 inline-block rounded bg-entity-policy/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-entity-policy">
                {intent}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No active query</p>
        )}
      </Section>

      <Section title="Saved searches" defaultOpen={savedSearches.length > 0}>
        {savedSearches.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Press Enter on a query to save it</p>
        ) : (
          <div className="flex w-full flex-col gap-0.5">
            {savedSearches.slice(0, 6).map((s) => (
              <div
                key={s.at}
                className="group flex items-center justify-between gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <button
                  type="button"
                  className="truncate text-left"
                  onClick={() => void submitAnalystQuestion(s.q, dataset)}
                >
                  {s.q}
                </button>
                <button
                  type="button"
                  onClick={() => removeSavedSearch(s.at)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Filters
      </div>

      {importedCount > 0 && (
        <Section
          title="Sources"
          defaultOpen={false}
          count={filters.include_imported ? 1 : 0}
          onClear={() => patchFilters({ include_imported: undefined })}
        >
          <div className="w-full">
            <Chip
              active={!!filters.include_imported}
              color="#8B919A"
              onClick={() =>
                patchFilters({ include_imported: filters.include_imported ? undefined : true })
              }
            >
              + Climate Policy Database ({importedCount})
            </Chip>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              Real policies from{" "}
              <a
                href="https://climatepolicydatabase.org/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                NewClimate Institute
              </a>{" "}
              (CC BY-NC 4.0). Not reviewed and not linked to evidence.
            </p>
          </div>
        </Section>
      )}

      <Section
        title="Jurisdictions"
        count={filters.countries?.length}
        onClear={() => patchFilters({ countries: undefined })}
      >
        {jurisdictionChips.map((j) => (
          <Chip
            key={j.id}
            active={!!filters.countries?.includes(j.country_code)}
            color="#9B7BFF"
            onClick={() => toggleIn("countries", j.country_code)}
          >
            <span title={j.name} className="flex items-baseline gap-1">
              {j.country_code}
              <span className="font-sans text-[9px] normal-case tracking-normal opacity-80">
                {j.name}
              </span>
            </span>
          </Chip>
        ))}
      </Section>

      <Section
        title="Technologies"
        count={filters.technology_ids?.length}
        onClear={() => patchFilters({ technology_ids: undefined })}
      >
        {dataset.technologies.map((t) => (
          <Chip
            key={t.id}
            active={!!filters.technology_ids?.includes(t.id)}
            color="#2FD3E6"
            onClick={() => toggleIn("technology_ids", t.id)}
          >
            {t.name}
          </Chip>
        ))}
      </Section>

      <Section
        title="Mechanisms"
        count={filters.mechanism_ids?.length}
        onClear={() => patchFilters({ mechanism_ids: undefined })}
      >
        {dataset.mechanisms.map((m) => (
          <Chip
            key={m.id}
            active={!!filters.mechanism_ids?.includes(m.id)}
            color="#FF9A3D"
            onClick={() => toggleIn("mechanism_ids", m.id)}
          >
            {m.name}
          </Chip>
        ))}
      </Section>

      <Section
        title="Years introduced"
        defaultOpen={false}
        count={filters.year_from || filters.year_to ? 1 : 0}
        onClear={() => patchFilters({ year_from: undefined, year_to: undefined })}
      >
        <div className="w-full px-1 pb-1">
          <Slider
            min={2005}
            max={2025}
            step={1}
            value={[yearFrom, yearTo]}
            onValueChange={([a, b]) =>
              patchFilters({
                year_from: a === 2005 ? undefined : a,
                year_to: b === 2025 ? undefined : b,
              })
            }
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{yearFrom}</span>
            <span>{yearTo}</span>
          </div>
        </div>
      </Section>

      <Section
        title="Evidence strength"
        defaultOpen={false}
        count={filters.evidence_strength_min ? 1 : 0}
        onClear={() => patchFilters({ evidence_strength_min: undefined })}
      >
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() =>
                patchFilters({ evidence_strength_min: v === 0 ? undefined : v })
              }
              className={cn(
                "h-5 w-7 rounded-sm border font-mono text-[10px]",
                (filters.evidence_strength_min ?? 0) >= v && v > 0
                  ? "border-entity-evidence bg-entity-evidence/20 text-entity-evidence"
                  : "border-border text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Status"
        defaultOpen={false}
        count={filters.status ? 1 : 0}
        onClear={() => patchFilters({ status: undefined })}
      >
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={filters.status === s}
            color="#4C8DFF"
            onClick={() =>
              patchFilters({ status: filters.status === s ? undefined : s })
            }
          >
            {s}
          </Chip>
        ))}
      </Section>

    </aside>
  );
}
