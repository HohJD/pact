"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  Crosshair,
  ExternalLink,
  GitCompare,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

import { storeLastQuery } from "@/components/back-to-results";
import { Flag } from "@/components/flag";
import { useDataset } from "@/components/providers/dataset-provider";
import { WeightsDialog } from "@/components/results/weights-dialog";
import { submitAnalystQuestion } from "@/lib/ai/client";
import type { Policy, Similarity } from "@/lib/domain/schema";
import {
  storeSimilarityPrefs,
  useSimilarityPrefs,
} from "@/lib/similarity/prefs";
import { rescoreSimilarity } from "@/lib/similarity/structured";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

interface SearchPolicy {
  id: string;
  name: string;
  short_name: string | null;
  jurisdiction_id: string;
  country_code: string;
  introduced: string;
  ended: string | null;
  status: string;
  data_status: Policy["data_status"];
  description: string;
  sector: string;
  mechanism_ids: string[];
  technology_ids: string[];
  score: number;
}

interface SearchResponse {
  query: string;
  policies: SearchPolicy[];
  similarities: Similarity[];
  total_searched: number;
  semantic: boolean;
}

const EXAMPLES = [
  "Which policies accelerated heat-pump adoption?",
  "heat pump grants",
  "insulation subsidies for low-income households",
  "building energy codes",
];

const simBand = (score: number) =>
  Math.max(1, Math.min(10, Math.ceil(score * 10)));

const STATUS_PILL: Record<string, string> = {
  ACTIVE: "text-entity-outcome border-entity-outcome/40",
  ANNOUNCED: "text-entity-policy border-entity-policy/40",
  SUPERSEDED: "text-muted-foreground border-border",
  CLOSED: "text-muted-foreground border-border",
  PAUSED: "text-muted-foreground border-border",
};

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

export function ResultsView() {
  const dataset = useDataset();
  const query = useWorkspace((s) => s.query);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const prefs = useSimilarityPrefs();
  const seq = useRef(0);

  const steps = [
    `Full-text search in ${dataset.policies.length} policies`,
    "Semantic similarity (local embeddings)",
    "Ranking by relevance",
    "Preparing charts",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const t = window.setInterval(
      () => setStep((s) => Math.min(s + 1, steps.length - 1)),
      450,
    );
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const run = useCallback(async (q: string) => {
    const id = ++seq.current;
    setLoading(true);
    setStep(0);
    setSelectedId(null);
    storeLastQuery(q);
    try {
      const res = await fetch(
        `/api/search/policies?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SearchResponse;
      if (seq.current === id) setResult(data);
    } catch {
      if (seq.current === id) setResult(null);
    } finally {
      if (seq.current === id) setLoading(false);
    }
  }, []);

  // the submitted workspace query drives the results fetch
  useEffect(() => {
    const q = query.trim();
    const frame = window.requestAnimationFrame(() => {
      if (!q) {
        seq.current += 1;
        setResult(null);
        setLoading(false);
        return;
      }
      void run(q);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [query, run]);

  // Escape clears the similarity ranking
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // in-workspace compare — only add ids, never toggle one off
  const compare = useCallback(
    (...ids: string[]) => {
      const cur = new Set(useWorkspace.getState().compareIds);
      for (const id of ids) if (!cur.has(id)) toggleCompare(id);
      openPanel("COMPARE");
    },
    [toggleCompare, openPanel],
  );

  // client-side rescoring with the user's weights — no refetch
  const rescored = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of result?.similarities ?? []) {
      map.set(
        [s.policy_a, s.policy_b].sort().join("|"),
        rescoreSimilarity(s.breakdown, prefs.weights),
      );
    }
    return map;
  }, [result, prefs.weights]);

  const simToSelected = useMemo(() => {
    if (!selectedId) return null;
    const m = new Map<string, number>();
    m.set(selectedId, 1);
    for (const s of result?.similarities ?? []) {
      if (s.policy_a === selectedId)
        m.set(
          s.policy_b,
          rescored.get([s.policy_a, s.policy_b].sort().join("|")) ?? 0,
        );
      else if (s.policy_b === selectedId)
        m.set(
          s.policy_a,
          rescored.get([s.policy_a, s.policy_b].sort().join("|")) ?? 0,
        );
    }
    return m;
  }, [result, rescored, selectedId]);

  const rows = useMemo(() => {
    const list = [...(result?.policies ?? [])];
    if (simToSelected) {
      list.sort(
        (a, b) =>
          (simToSelected.get(b.id) ?? -1) - (simToSelected.get(a.id) ?? -1) ||
          b.score - a.score,
      );
    } else {
      list.sort((a, b) => b.score - a.score);
    }
    return list;
  }, [result, simToSelected]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // ---- ranking chart data ----------------------------------------------
  const chartData = useMemo(() => {
    if (simToSelected && selected) {
      const others = rows
        .filter(
          (p) =>
            p.id !== selectedId &&
            simToSelected.has(p.id) &&
            (simToSelected.get(p.id) ?? 0) * 100 >= prefs.threshold,
        )
        .map((p) => ({
          id: p.id,
          label: `${p.country_code} · ${truncate(p.short_name ?? p.name, 15)}`,
          value: Math.round((simToSelected.get(p.id) ?? 0) * 100),
        }))
        .sort((a, b) => b.value - a.value);
      return [
        {
          id: selected.id,
          label: `${selected.country_code} · ${truncate(selected.short_name ?? selected.name, 15)}`,
          value: 100,
          pinned: true,
        },
        ...others,
      ];
    }
    return rows
      .map((p) => ({
        id: p.id,
        label: `${p.country_code} · ${truncate(p.short_name ?? p.name, 15)}`,
        value: Math.round(p.score * 100),
      }))
      .slice(0, 15);
  }, [rows, simToSelected, selected, selectedId, prefs.threshold]);

  // ---- breakdown chips ---------------------------------------------------
  const breakdown = useMemo(() => {
    const list = result?.policies ?? [];
    const byJurisdiction = new Map<string, number>();
    const byMechanism = new Map<string, number>();
    for (const p of list) {
      byJurisdiction.set(
        p.country_code,
        (byJurisdiction.get(p.country_code) ?? 0) + 1,
      );
      for (const m of p.mechanism_ids)
        byMechanism.set(m, (byMechanism.get(m) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, n: number) => {
      const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
      const head = sorted.slice(0, n);
      const rest = sorted.slice(n).reduce((s, [, c]) => s + c, 0);
      return rest ? [...head, ["__other__", rest] as [string, number]] : head;
    };
    return {
      jurisdictions: top(byJurisdiction, 6),
      mechanisms: top(byMechanism, 6).map(([id, c]) => [
        id === "__other__" ? id : (dataset.mechanisms.find((m) => m.id === id)?.name ?? id),
        c,
      ]) as [string, number][],
    };
  }, [result, dataset]);

  const onBarClick = useCallback(
    (id: string) => {
      if (selectedId) {
        if (id !== selectedId) compare(selectedId, id);
      } else {
        setSelectedId(id);
      }
    },
    [selectedId, compare],
  );

  const examples = (
    <ul className="flex flex-wrap gap-2">
      {EXAMPLES.map((e) => (
        <li key={e}>
          <button
            type="button"
            onClick={() => void submitAnalystQuestion(e, dataset)}
            className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-entity-policy/50 hover:text-foreground"
          >
            {e}
          </button>
        </li>
      ))}
    </ul>
  );

  const muted = "var(--muted-foreground)";
  const policyColor = "var(--entity-policy)";
  const pinnedColor = "color-mix(in oklab, var(--entity-policy) 45%, transparent)";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
      {loading && (
        <div className="surface p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching for “{query}”
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-1.5">
                {i < step ? (
                  <Check className="h-3 w-3 text-entity-outcome" />
                ) : i === step ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="h-3 w-3" />
                )}
                <span className={i > step ? "opacity-40" : undefined}>
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !query && (
        <div className="surface p-5">
          <p className="text-[12px] text-muted-foreground">
            Ask a question or search above to see ranked policies
          </p>
          <div className="mt-3">{examples}</div>
        </div>
      )}

      {query && !loading && !result && (
        <div className="surface p-5">
          <p className="text-[12px] text-muted-foreground">
            No policies matched “{query}”
          </p>
          <div className="mt-3">{examples}</div>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] text-muted-foreground">
              {result.policies.length} of {result.total_searched} policies ·
              semantic match {result.semantic ? "on" : "off"}
            </p>
            <button
              type="button"
              aria-label="Similarity weights"
              title="Similarity weights"
              onClick={() => setWeightsOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">
            {/* left column — charts */}
            <div className="w-full shrink-0 space-y-4 lg:w-[48%]">
              <div className="surface p-4">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Ranking
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {selected
                        ? `Similarity to ${selected.short_name ?? selected.name}`
                        : "Relevance"}
                    </p>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded border border-border px-1 font-mono text-[9px] text-muted-foreground hover:text-foreground"
                      >
                        × Clear
                      </button>
                    )}
                  </div>
                </div>
                <div data-testid="results-chart">
                  <ResponsiveContainer
                    width="100%"
                    height={chartData.length * 26 + 12}
                  >
                  <BarChart
                    layout="vertical"
                    accessibilityLayer={false}
                    data={chartData}
                    margin={{ top: 4, right: 36, bottom: 0, left: 0 }}
                    onClick={(st) => {
                      const i = Number(
                        (st as { activeTooltipIndex?: number | string })
                          ?.activeTooltipIndex,
                      );
                      const d = chartData[i];
                      if (d) onBarClick(d.id);
                    }}
                    onMouseMove={(st) => {
                      const i = Number(
                        (st as { activeTooltipIndex?: number | string })
                          ?.activeTooltipIndex,
                      );
                      const d = chartData[i];
                      setHoveredId(d ? d.id : null);
                    }}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={150}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tick={(props: {
                        x?: number | string;
                        y?: number | string;
                        payload?: { value?: string };
                      }) => (
                        <text
                          x={Number(props.x) - 6}
                          y={Number(props.y) + 3.5}
                          textAnchor="end"
                          fontSize={10}
                          fontFamily="var(--font-mono)"
                          fill={
                            props.payload?.value ===
                            `${selected?.country_code} · ${truncate(selected?.short_name ?? selected?.name ?? "", 15)}` &&
                            selected
                              ? "var(--foreground)"
                              : muted
                          }
                        >
                          {props.payload?.value}
                        </text>
                      )}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 3, 3, 0]}
                      barSize={12}
                      isAnimationActive
                      animationDuration={400}
                      cursor="pointer"
                      activeBar={false}
                    >
                      {chartData.map((d) => (
                        <Cell
                          key={d.id}
                          className={`bar-${d.id}`}
                          fill={
                            "pinned" in d && d.pinned
                              ? pinnedColor
                              : hoveredId === d.id
                                ? "color-mix(in oklab, var(--entity-policy) 80%, white)"
                                : policyColor
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        style={{
                          fontSize: 10,
                          fill: muted,
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </Bar>
                  </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {selected
                    ? `Bar = similarity to ${selected.short_name ?? selected.name} · click a bar to compare`
                    : "Bar = relevance to your query · click a bar to rank by similarity · click again to compare"}
                </p>
              </div>

              {/* breakdown */}
              <div className="surface p-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Breakdown
                </p>
                <BreakdownRow
                  label="By jurisdiction"
                  segments={breakdown.jurisdictions.map(([code, n], i) => ({
                    key: code,
                    value: n,
                    color: `var(--chart-${(i % 5) + 1})`,
                    label:
                      code === "__other__" ? `other (${n})` : `${code} (${n})`,
                  }))}
                  total={result.policies.length}
                />
                <BreakdownRow
                  label="By mechanism"
                  segments={breakdown.mechanisms.map(([name, n], i) => ({
                    key: name,
                    value: n,
                    color: `color-mix(in oklab, var(--entity-mechanism) ${Math.max(30, 90 - i * 12)}%, transparent)`,
                    label:
                      name === "__other__" ? `other (${n})` : `${truncate(name, 16)} (${n})`,
                  }))}
                  total={result.policies.length}
                />
              </div>
            </div>

            {/* right column — ranked list */}
            <div className="min-w-0 flex-1">
              {rows.length === 0 && (
                <div className="surface p-4">
                  <p className="text-[12px] text-muted-foreground">
                    No policies matched “{result.query}”
                  </p>
                  <div className="mt-3">{examples}</div>
                </div>
              )}
              <ul className="space-y-1.5">
                {rows.map((p) => {
                  const sim = simToSelected?.get(p.id);
                  const isSel = selectedId === p.id;
                  const inSimilarSet = simToSelected
                    ? sim != null || isSel
                    : true;
                  return (
                    <li
                      key={p.id}
                      data-sim={sim != null ? simBand(sim) : undefined}
                      className={cn(!inSimilarSet && "opacity-40")}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() =>
                        setHoveredId((h) => (h === p.id ? null : h))
                      }
                    >
                      <div
                        className={cn(
                          "group flex items-center gap-2 rounded-md px-3 py-2 text-[12.5px] leading-snug hover:bg-secondary/50",
                          isSel && "bg-entity-policy/5 ring-1 ring-entity-policy/40",
                        )}
                      >
                        <button
                          type="button"
                          title={p.name}
                          onClick={() => {
                            select({ kind: "policy", id: p.id });
                            openPanel("DETAILS");
                          }}
                          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                        >
                          <span className="flex min-w-0 items-baseline gap-2">
                            <Flag code={p.country_code} />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1">{p.name}</span>
                              {p.short_name && (
                                <span className="ml-1.5 rounded border border-border px-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                  {p.short_name}
                                </span>
                              )}
                            </span>
                          </span>
                          <span
                            className="h-[2px] rounded-full bg-entity-policy/60"
                            style={{
                              width: `${Math.round(
                                (simToSelected
                                  ? (simToSelected.get(p.id) ?? 0)
                                  : p.score) * 100,
                              )}%`,
                            }}
                          />
                        </button>
                        <span className="flex shrink-0 items-center gap-2">
                          {simToSelected && (
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              {isSel
                                ? "—"
                                : sim != null
                                  ? Math.round(sim * 100)
                                  : "–"}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {p.introduced?.slice(0, 4)}
                          </span>
                          <span
                            className={cn(
                              "rounded border px-1.5 py-px font-mono text-[8px] uppercase tracking-wider",
                              STATUS_PILL[p.status] ??
                                "text-muted-foreground border-border",
                            )}
                          >
                            {p.status}
                          </span>
                          <span className="flex items-center gap-2">
                            {selectedId && !isSel && (
                              <button
                                type="button"
                                title={`Compare ${selected?.short_name ?? selectedId} ↔ ${p.short_name ?? p.name}`}
                                aria-label={`Compare with ${p.short_name ?? p.name}`}
                                onClick={() => compare(selectedId, p.id)}
                                className="text-muted-foreground transition-opacity hover:text-entity-policy lg:opacity-0 lg:group-hover:opacity-100"
                              >
                                <GitCompare className="size-3.5" />
                              </button>
                            )}
                            {isSel && (
                              <span className="rounded border border-entity-policy/50 bg-entity-policy/10 px-1 font-mono text-[8px] uppercase tracking-wider text-entity-policy">
                                selected
                              </span>
                            )}
                            <button
                              type="button"
                              title="Rank by similarity"
                              aria-label={`Select ${p.short_name ?? p.name}`}
                              onClick={() =>
                                setSelectedId(isSel ? null : p.id)
                              }
                              className="text-muted-foreground transition-opacity hover:text-entity-policy lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <Crosshair className="size-3.5" />
                            </button>
                            <Link
                              href={`/policy/${p.id}`}
                              title={`Open ${p.short_name ?? p.name}`}
                              aria-label="Open policy page"
                              className="text-muted-foreground transition-opacity hover:text-entity-policy lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      <WeightsDialog
        open={weightsOpen}
        onOpenChange={setWeightsOpen}
        onApply={storeSimilarityPrefs}
      />
    </div>
  );
}

function BreakdownRow({
  label,
  segments,
  total,
}: {
  label: string;
  segments: { key: string; value: number; color: string; label: string }[];
  total: number;
}) {
  const data = [
    { name: label, ...Object.fromEntries(segments.map((s) => [s.key, s.value])) },
  ];
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[10px] text-muted-foreground">{label}</p>
      <ResponsiveContainer width="100%" height={16}>
      <BarChart
        layout="vertical"
        accessibilityLayer={false}
        data={data}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="name" hide />
        {segments.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            barSize={10}
            radius={
              (i === 0
                ? [3, 0, 0, 3]
                : i === segments.length - 1
                  ? [0, 3, 3, 0]
                  : [0, 0, 0, 0]) as [number, number, number, number]
            }
            isAnimationActive={false}
          />
        ))}
      </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-1">
        {segments.map((s) => (
          <span
            key={s.key}
            className="rounded border border-border px-1 py-px font-mono text-[8.5px] text-muted-foreground"
          >
            <span
              className="mr-1 inline-block size-1.5 rounded-[2px] align-middle"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
