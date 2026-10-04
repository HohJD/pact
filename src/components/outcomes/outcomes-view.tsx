"use client";

import { useMemo } from "react";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { InferenceChip } from "@/components/panel/inference-chip";
import { SectionTitle } from "@/components/panel/section-title";
import {
  useDataset,
  useRepo,
} from "@/components/providers/dataset-provider";
import type { Policy, TimeSeries } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const GREEN = "#3DDC97";
const MUTED = "#8B919A";

export function OutcomesView() {
  const dataset = useDataset();
  const repo = useRepo();
  const filters = useWorkspace((s) => s.filters);
  const selection = useWorkspace((s) => s.selection);
  const compareIds = useWorkspace((s) => s.compareIds);
  const select = useWorkspace((s) => s.select);
  const openEvidence = useWorkspace((s) => s.openEvidence);

  // subject: selected policy → compare set → top-6 in view by evidence strength
  const subjectPool: Policy[] = useMemo(() => {
    if (selection?.kind === "policy") {
      const p = dataset.policies.find((x) => x.id === selection.id);
      if (p) return [p];
    }
    if (compareIds.length > 0)
      return compareIds
        .map((id) => dataset.policies.find((p) => p.id === id))
        .filter((p): p is Policy => !!p);
    const { evidence_strength_min, ...rest } = filters;
    const inView = repo
      .listPolicies(rest)
      .map((p) => ({ p, score: repo.getEvidenceStrength(p.id).score }))
      .filter((x) => x.score >= (evidence_strength_min ?? 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.p);
    return inView;
  }, [selection, compareIds, filters, dataset, repo]);

  const subject = subjectPool[0];

  const allOutcomes = useMemo(
    () => subjectPool.flatMap((p) => repo.getOutcomesForPolicy(p.id)),
    [subjectPool, repo],
  );
  const counts = {
    causal: allOutcomes.filter((o) => o.inference === "CAUSAL").length,
    correlational: allOutcomes.filter((o) => o.inference === "CORRELATIONAL").length,
    descriptive: allOutcomes.filter((o) => o.inference === "DESCRIPTIVE").length,
  };

  // switchable subject chips when there is a pool
  const pool = subjectPool;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* top strip */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          What the evidence supports
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px]">
          <span className="rounded border border-entity-outcome/40 px-1 text-entity-outcome">
            {counts.causal} causal
          </span>
          <span className="rounded border border-entity-evidence/40 px-1 text-entity-evidence">
            {counts.correlational} correlational
          </span>
          <span className="rounded border border-border px-1 text-muted-foreground">
            {counts.descriptive} descriptive
          </span>
        </span>
        <span className="ml-auto hidden text-[9.5px] text-muted-foreground lg:block">
          Correlation is shown as correlation. Causal labels appear only where the cited
          evidence uses causal methods.
        </span>
      </div>

      {pool.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
          {pool.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select({ kind: "policy", id: p.id })}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px]",
                subject?.id === p.id
                  ? "border-entity-policy bg-entity-policy/15 text-entity-policy"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.short_name ?? p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {!subject ? (
          <EmptyState />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
            <div className="grid flex-1 grid-cols-1 content-start gap-4 2xl:grid-cols-2">
              <SeriesCards subject={subject} repo={repo} dataset={dataset} openEvidence={openEvidence} />
            </div>
            <div className="w-full shrink-0 xl:w-[320px]">
              <SectionTitle>Observed outcomes</SectionTitle>
              <SubjectOutcomes subject={subject} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectOutcomes({ subject }: { subject: Policy }) {
  const repo = useRepo();
  const select = useWorkspace((s) => s.select);
  const openEvidence = useWorkspace((s) => s.openEvidence);
  const outcomes = repo.getOutcomesForPolicy(subject.id);

  if (outcomes.length === 0)
    return (
      <div className="rounded border border-border/60 p-3">
        <p className="text-[11px] text-muted-foreground">
          Insufficient outcome data for {subject.short_name ?? subject.name}. PACT does not
          infer outcomes without evidence.
        </p>
      </div>
    );

  return (
    <ul className="space-y-2">
      {outcomes.map((o) => (
        <li key={o.id} className="rounded border border-border/60 p-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] leading-snug text-foreground">{o.headline}</p>
            <InferenceChip inference={o.inference} />
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
            {o.magnitude ? `${o.magnitude} · ` : ""}
            {o.period}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {o.evidence_ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  select({ kind: "policy", id: subject.id });
                  openEvidence(id);
                }}
                className="rounded border border-entity-evidence/40 px-1 font-mono text-[8px] text-entity-evidence hover:bg-entity-evidence/10"
              >
                source
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="surface max-w-sm px-6 py-5 text-center">
        <p className="text-dense text-muted-foreground">
          Insufficient outcome data. PACT does not infer outcomes without evidence.
        </p>
      </div>
    </div>
  );
}

function SeriesCards({
  subject,
  repo,
  dataset,
  openEvidence,
}: {
  subject: Policy;
  repo: ReturnType<typeof useRepo>;
  dataset: ReturnType<typeof useDataset>;
  openEvidence: (id: string) => void;
}) {
  const series = repo.getTimeSeries(subject.country_code);
  const subjectOutcomes = repo.getOutcomesForPolicy(subject.id);
  const causalEvidence = new Set(
    subjectOutcomes
      .filter((o) => o.inference === "CAUSAL")
      .flatMap((o) => o.evidence_ids),
  );

  // other same-country policies sharing a technology → faint markers
  const siblingPolicies = dataset.policies.filter(
    (p) =>
      p.id !== subject.id &&
      p.country_code === subject.country_code &&
      p.technology_ids.some((t) => subject.technology_ids.includes(t)),
  );

  // metrics the policy reports outcomes on but PACT holds no series for
  const coveredMetrics = new Set(series.map((ts) => ts.metric_id));
  const missingMetrics = [...new Set(subjectOutcomes.map((o) => o.metric_id))].filter(
    (m) => !coveredMetrics.has(m),
  );

  if (series.length === 0 && missingMetrics.length === 0)
    return (
      <div className="surface p-4 text-[11px] text-muted-foreground">
        No time-series for {subject.country_code}.
      </div>
    );

  return (
    <>
      {missingMetrics.map((m) => (
        <div key={m} className="surface p-4">
          <p className="text-[11px] text-muted-foreground">
            No time-series data in PACT for{" "}
            {dataset.metrics.find((mm) => mm.id === m)?.name ?? m}.
          </p>
        </div>
      ))}
      {series.map((ts) => (
        <SeriesCard
          key={ts.id}
          ts={ts}
          subject={subject}
          siblings={siblingPolicies}
          dataset={dataset}
          causal={!!(ts.source_evidence_id && causalEvidence.has(ts.source_evidence_id))}
          openEvidence={openEvidence}
        />
      ))}
    </>
  );
}

function SeriesCard({
  ts,
  subject,
  siblings,
  dataset,
  causal,
  openEvidence,
}: {
  ts: TimeSeries;
  subject: Policy;
  siblings: Policy[];
  dataset: ReturnType<typeof useDataset>;
  causal: boolean;
  openEvidence: (id: string) => void;
}) {
  const metric = dataset.metrics.find((m) => m.id === ts.metric_id);
  const source = ts.source_evidence_id
    ? dataset.evidence.find((e) => e.id === ts.source_evidence_id)
    : null;
  const demo = ts.data_status === "DEMO" || ts.precision === "ILLUSTRATIVE";

  const data = ts.points.map((p) => ({ ...p }));
  const subjectYear = parseInt(subject.introduced.slice(0, 4), 10);
  const endYear = subject.ended ? parseInt(subject.ended.slice(0, 4), 10) : null;

  const siblingYears = siblings
    .map((s) => ({ year: parseInt(s.introduced.slice(0, 4), 10), name: s.short_name ?? s.name }))
    .filter((s) => data.some((p) => p.year === s.year));

  return (
    <div className="surface p-3">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-[12px] font-medium text-foreground">
          {metric?.name ?? ts.metric_id}
          <span className="ml-1.5 font-mono text-[9px] text-muted-foreground">
            {ts.country_code} · {metric?.unit}
          </span>
        </h3>
        {demo && (
          <span className="rounded bg-entity-evidence/20 px-1 font-mono text-[8px] text-entity-evidence">
            DEMO DATA
          </span>
        )}
        <span className="ml-auto rounded border border-border px-1 font-mono text-[8px] text-muted-foreground">
          {ts.precision}
        </span>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#ffffff08" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: MUTED, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "#ffffff14" }}
              tickLine={false}
              domain={[2014, 2025]}
              type="number"
              allowDecimals={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: MUTED, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              content={
                <SeriesTooltip
                  metric={metric}
                  precision={ts.precision}
                  sourceName={source?.publisher ?? null}
                />
              }
            />
            {data.some((p) => p.year === subjectYear) && (
              <ReferenceLine
                x={subjectYear}
                stroke="#4C8DFF"
                strokeWidth={1.5}
                label={{
                  value: `${subject.short_name ?? subject.name}`,
                  position: "insideTopRight",
                  fontSize: 8,
                  fill: "#4C8DFF",
                  fontFamily: "var(--font-mono)",
                }}
              />
            )}
            {endYear && data.some((p) => p.year === endYear) && (
              <ReferenceLine x={endYear} stroke="#8B919A" strokeDasharray="3 3" />
            )}
            {siblingYears.map((s) => (
              <ReferenceLine
                key={s.name}
                x={s.year}
                stroke="#4C8DFF"
                strokeOpacity={0.25}
                strokeDasharray="2 4"
              />
            ))}
            <Area
              type="monotone"
              dataKey="value"
              stroke={GREEN}
              strokeWidth={1.5}
              strokeDasharray={demo ? "5 4" : undefined}
              fill={GREEN}
              fillOpacity={0.08}
              dot={(props: { cx?: number; cy?: number; payload?: { year: number } }) => {
                const { cx, cy } = props;
                const hollow = ts.precision !== "REPORTED";
                return (
                  <circle
                    key={`${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={2.5}
                    fill={hollow ? "#0B0C0F" : GREEN}
                    stroke={GREEN}
                    strokeWidth={1.2}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="value" stroke="none" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          {source ? (
            <button
              type="button"
              onClick={() => openEvidence(source.id)}
              className="text-entity-evidence hover:underline"
            >
              {source.publisher} — {source.title}
            </button>
          ) : (
            "No source"
          )}
          {ts.note && ` · ${ts.note}`}
        </span>
        <span className="font-mono text-[8px] text-muted-foreground">
          {causal
            ? "Cited by a causal outcome"
            : "Observed around implementation — not attribution"}
        </span>
      </div>
    </div>
  );
}

function SeriesTooltip({
  active,
  payload,
  label,
  metric,
  precision,
  sourceName,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: number;
  metric: { name: string; unit?: string } | undefined;
  precision: string;
  sourceName: string | null;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 shadow-lg">
      <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
      <p className="text-[12px] font-medium text-foreground">
        {typeof v === "number" ? v.toLocaleString() : v}
        {metric?.unit ? (
          <span className="ml-1 font-mono text-[9px] text-muted-foreground">
            {metric.unit}
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span className="rounded border border-border px-1 font-mono text-[8px] text-muted-foreground">
          {precision}
        </span>
        {sourceName && (
          <span className="font-mono text-[8px] text-muted-foreground">{sourceName}</span>
        )}
      </p>
    </div>
  );
}
