"use client";

import { useMemo, useState } from "react";

import { ArrowLeft, Check } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { ClaimList } from "@/components/claims/claim-list";
import { SectionTitle } from "@/components/panel/section-title";
import { Button } from "@/components/ui/button";
import { useDataset } from "@/components/providers/dataset-provider";
import type { TransferAssessment } from "@/lib/ai/transfer-fallback";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const COUNTRY_ORDER = [
  "GB",
  "DE",
  "FR",
  "NL",
  "DK",
  "NO",
  "EU",
  "US",
  "JP",
  "KR",
  "CN",
  "IN",
  "SG",
];

const LEVEL_STYLE: Record<string, string> = {
  HIGH: "border-entity-technology/40 bg-entity-technology/10 text-entity-technology",
  MEDIUM: "border-entity-evidence/40 bg-entity-evidence/10 text-entity-evidence",
  LOW: "border-border bg-secondary text-muted-foreground",
};

export function TransferView() {
  const dataset = useDataset();
  const request = useWorkspace((s) => s.transferRequest);
  const result = useWorkspace((s) => s.transferResult);
  const pending = useWorkspace((s) => s.transferPending);
  const setResult = useWorkspace((s) => s.setTransferResult);
  const setPending = useWorkspace((s) => s.setTransferPending);
  const closeTransfer = useWorkspace((s) => s.closeTransfer);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const compareIds = useWorkspace((s) => s.compareIds);
  const selection = useWorkspace((s) => s.selection);

  const defaultTarget =
    dataset.jurisdictions.find((j) => j.id === "jur_gb_oxford") ??
    dataset.jurisdictions.find(
      (j) => j.level === "CITY" || j.level === "STATE",
    ) ??
    dataset.jurisdictions[0];
  const defaultSources =
    request?.source_policy_ids ??
    (compareIds.length > 0
      ? compareIds
      : selection?.kind === "policy"
        ? [selection.id]
        : []);

  const [targetId, setTargetId] = useState(
    request?.target_jurisdiction_id ?? defaultTarget?.id ?? "",
  );
  const [sourceIds, setSourceIds] = useState<string[]>(defaultSources);
  const [pickerOpen, setPickerOpen] = useState(false);

  const policiesByCountry = useMemo(() => {
    const m = new Map<string, typeof dataset.policies>();
    for (const p of dataset.policies) {
      const list = m.get(p.country_code) ?? [];
      list.push(p);
      m.set(p.country_code, list);
    }
    return m;
  }, [dataset]);

  // target select: default jurisdiction (Oxford) first, then the rest
  const jurisdictions = useMemo(
    () =>
      [...dataset.jurisdictions].sort(
        (a, b) => (b.id === defaultTarget?.id ? 1 : 0) - (a.id === defaultTarget?.id ? 1 : 0),
      ),
    [dataset, defaultTarget],
  );

  const target = dataset.jurisdictions.find((j) => j.id === targetId);
  const sources = sourceIds
    .map((id) => dataset.policies.find((p) => p.id === id))
    .filter(Boolean);

  const assess = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_jurisdiction_id: targetId,
          source_policy_ids: sourceIds,
        }),
      });
      setResult((await res.json()) as TransferAssessment);
    } catch (err) {
      console.warn("[pact] transfer request failed", err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-1.5">
        <button
          type="button"
          onClick={closeTransfer}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Policy transfer
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] text-foreground"
          >
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                → {j.name}
              </option>
            ))}
          </select>
          <Button size="sm" className="h-7 text-[10px]" onClick={assess} disabled={pending || sourceIds.length === 0}>
            {pending ? "Assessing…" : "Assess"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {/* inputs */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Sources
          </span>
          {sourceIds.map((id) => {
            const p = dataset.policies.find((x) => x.id === id);
            if (!p) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded border border-entity-policy bg-entity-policy/15 px-1.5 py-0.5 font-mono text-[9px] text-entity-policy"
              >
                {p.short_name ?? p.name}
                <button
                  type="button"
                  aria-label={`Remove ${p.short_name ?? p.name}`}
                  onClick={() => setSourceIds((ids) => ids.filter((i) => i !== id))}
                  className="hover:text-foreground"
                >
                  ×
                </button>
              </span>
            );
          })}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded border border-dashed border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              >
                + Add policy
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(320px,calc(100vw-2rem))] p-0">
              <Command>
                <CommandInput placeholder="Search policies…" />
                <CommandList className="max-h-[280px]">
                  <CommandEmpty>No matching policy.</CommandEmpty>
                  {COUNTRY_ORDER.map((cc) => {
                    const ps = policiesByCountry.get(cc);
                    if (!ps?.length) return null;
                    return (
                      <CommandGroup key={cc} heading={cc}>
                        {ps.map((p) => {
                          const sel = sourceIds.includes(p.id);
                          return (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.short_name ?? ""} ${cc}`}
                              onSelect={() =>
                                setSourceIds((ids) =>
                                  sel
                                    ? ids.filter((i) => i !== p.id)
                                    : [...ids, p.id].slice(0, 4),
                                )
                              }
                              className="text-[11px]"
                            >
                              <Check
                                className={cn(
                                  "mr-1.5 size-3 text-entity-policy",
                                  sel ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="truncate">{p.short_name ?? p.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-4 rounded border border-entity-jurisdiction/30 bg-entity-jurisdiction/10 px-3 py-2 text-[10.5px] text-foreground">
          Evidence-based comparison — not a forecast. PACT describes what happened
          elsewhere and how contexts differ; it does not predict outcomes.
        </div>

        {pending && (
          <p className="text-[11px] text-muted-foreground">Assessing transfer…</p>
        )}

        {result && !pending && (
          <div className="max-w-3xl space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-[11px] font-semibold",
                  LEVEL_STYLE[result.transferability],
                )}
              >
                {result.transferability}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                transferability to {target?.name ?? targetId}
              </span>
              <span className="rounded border border-border px-1 font-mono text-[8px] text-muted-foreground">
                {result.source === "LLM" ? "LIVE" : "CURATED"}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-foreground">{result.rationale}</p>

            <div className="grid gap-4 pt-2 md:grid-cols-2">
              <div>
                <SectionTitle>Relevant similarities</SectionTitle>
                <ul className="space-y-1">
                  {result.similarities.map((s, i) => (
                    <li key={i} className="text-[11px] text-foreground">· {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionTitle>Important differences</SectionTitle>
                <ul className="space-y-1">
                  {result.differences.map((s, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">· {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <SectionTitle>Potential lessons</SectionTitle>
            <ClaimList claims={result.lessons} />

            <div className="pt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Evidence confidence: {result.evidence_confidence}
            </div>
            <ul className="space-y-1 pt-1">
              {result.caveats.map((c, i) => (
                <li key={i} className="text-[10px] text-muted-foreground">· {c}</li>
              ))}
            </ul>

            <div className="pt-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Sources:{" "}
              </span>
              {sources.map(
                (p) =>
                  p && (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        select({ kind: "policy", id: p.id });
                        openPanel("DETAILS");
                      }}
                      className="mr-1 rounded border border-entity-policy/40 px-1 font-mono text-[8px] text-entity-policy hover:bg-entity-policy/10"
                    >
                      {p.short_name ?? p.name}
                    </button>
                  ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
