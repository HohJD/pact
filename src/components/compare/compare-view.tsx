"use client";

import { motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";

import { keyDifferences, lessons } from "@/lib/analysis/compare";
import { ClaimList } from "@/components/claims/claim-list";
import { InferenceChip } from "@/components/panel/inference-chip";
import { EvidenceStrengthDots } from "@/components/panel/evidence-strength";
import { SectionTitle } from "@/components/panel/section-title";
import {
  useDataset,
  useRepo,
} from "@/components/providers/dataset-provider";
import type { Policy } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-entity-outcome border-entity-outcome/40",
  ANNOUNCED: "text-entity-policy border-entity-policy/40",
  PAUSED: "text-entity-evidence border-entity-evidence/40",
  CLOSED: "text-muted-foreground border-border",
  SUPERSEDED: "text-muted-foreground border-border",
};

function duration(p: Policy): string {
  const from = parseInt(p.introduced.slice(0, 4), 10);
  const to = p.ended ? parseInt(p.ended.slice(0, 4), 10) : 2025;
  const yrs = to - from;
  return p.ended ? `${p.introduced}–${p.ended} (${yrs} yrs)` : `ongoing, ${yrs} yrs`;
}

interface Row {
  label: string;
  values: (p: Policy) => React.ReactNode;
  text: (p: Policy) => string;
}

export function CompareView() {
  const dataset = useDataset();
  const repo = useRepo();
  const compareIds = useWorkspace((s) => s.compareIds);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const openPanel = useWorkspace((s) => s.openPanel);
  const select = useWorkspace((s) => s.select);

  const policies = compareIds
    .map((id) => dataset.policies.find((p) => p.id === id))
    .filter((p): p is Policy => !!p);

  if (policies.length < 2) return null;

  const mechName = (id: string) =>
    dataset.mechanisms.find((m) => m.id === id)?.name ?? id;
  const techName = (id: string) =>
    dataset.technologies.find((t) => t.id === id)?.name ?? id;
  const jurName = (id: string) =>
    dataset.jurisdictions.find((j) => j.id === id)?.name ?? id;

  const rows: Row[] = [
    { label: "Policy objective", text: (p) => p.objectives.join(" "), values: (p) => p.objectives.join(" · ") },
    {
      label: "Mechanism",
      text: (p) => p.mechanism_ids.map(mechName).join("|"),
      values: (p) => (
        <span className="flex flex-wrap gap-1">
          {p.mechanism_ids.map((m) => (
            <span key={m} className="rounded bg-entity-mechanism/15 px-1 text-[9px] text-entity-mechanism">
              {mechName(m)}
            </span>
          ))}
        </span>
      ),
    },
    {
      label: "Technology",
      text: (p) => p.technology_ids.map(techName).join("|"),
      values: (p) => (
        <span className="flex flex-wrap gap-1">
          {p.technology_ids.map((t) => (
            <span key={t} className="rounded bg-entity-technology/15 px-1 text-[9px] text-entity-technology">
              {techName(t)}
            </span>
          ))}
        </span>
      ),
    },
    { label: "Target population", text: (p) => p.target_groups.join("|"), values: (p) => p.target_groups.join(", ") },
    { label: "Incentive", text: (p) => p.incentive, values: (p) => p.incentive },
    { label: "Eligibility", text: (p) => p.eligibility, values: (p) => p.eligibility },
    { label: "Funding mechanism", text: (p) => p.funding, values: (p) => p.funding },
    {
      label: "Implementation",
      text: (p) => p.implementation_notes ?? "",
      values: (p) => p.implementation_notes ?? "—",
    },
    { label: "Start date", text: (p) => p.introduced, values: (p) => p.introduced },
    { label: "Duration", text: () => "", values: (p) => duration(p) },
    {
      label: "Evidence strength",
      text: (p) => String(repo.getEvidenceStrength(p.id).score),
      values: (p) => <EvidenceStrengthDots strength={repo.getEvidenceStrength(p.id)} showSummary={false} />,
    },
    {
      label: "Observed outcomes",
      text: (p) => repo.getOutcomesForPolicy(p.id).map((o) => o.headline).join("|"),
      values: (p) => {
        const outs = repo.getOutcomesForPolicy(p.id);
        if (outs.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <ul className="space-y-1">
            {outs.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-2">
                <span className="text-[10px] leading-snug">{o.headline}</span>
                <InferenceChip inference={o.inference} />
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      label: "Key limitations",
      text: (p) => p.limitations.join("|"),
      values: (p) =>
        p.limitations.length ? (
          <ul className="space-y-0.5">
            {p.limitations.map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const diffs = keyDifferences(policies, dataset);
  const lessonClaims = lessons(policies, dataset);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* slim header */}
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-1.5">
        <button
          type="button"
          onClick={() => openPanel(null)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to graph
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Comparing {policies.length} policies
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {policies.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 rounded border border-entity-policy/30 bg-entity-policy/10 px-1.5 py-0.5 font-mono text-[9px] text-entity-policy"
            >
              {p.short_name ?? p.name}
              <button type="button" onClick={() => toggleCompare(p.id)}>
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {/* comparison table — a single CSS grid so every row shares height */}
        <div
          className="grid min-w-full [--cmp-label:104px] [--cmp-col:220px] sm:[--cmp-label:180px] sm:[--cmp-col:260px]"
          style={{
            gridTemplateColumns: `var(--cmp-label) repeat(${policies.length}, minmax(var(--cmp-col), 1fr))`,
            width: `max(100%, calc(var(--cmp-label) + ${policies
              .map(() => "var(--cmp-col)")
              .join(" + ")}))`,
          }}
        >
          {/* header row */}
          <div className="sticky left-0 z-[1] border-b border-r border-border bg-background" />
          {policies.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2, ease: "easeOut" }}
              className="border-b border-r border-border p-3"
            >
              <div className="font-mono text-[9px] uppercase tracking-wider text-entity-jurisdiction">
                {jurName(p.jurisdiction_id)}
              </div>
              <button
                type="button"
                onClick={() => {
                  select({ kind: "policy", id: p.id });
                  openPanel("DETAILS");
                }}
                className="mt-0.5 text-left text-[12px] font-medium leading-tight text-foreground hover:underline"
              >
                {p.name}
              </button>
              <div className="mt-1 flex gap-1">
                <span
                  className={cn(
                    "rounded border px-1 font-mono text-[8px]",
                    STATUS_COLOR[p.status],
                  )}
                >
                  {p.status}
                </span>
                {p.data_status === "DEMO" && (
                  <span className="rounded bg-entity-evidence/20 px-1 font-mono text-[8px] text-entity-evidence">
                    DEMO
                  </span>
                )}
              </div>
            </motion.div>
          ))}

          {/* data rows */}
          {rows.map((r) => {
            const texts = policies.map((q) => r.text(q));
            const same = texts.every((t) => t === texts[0]);
            return (
              <div key={r.label} className="contents">
                <div className="sticky left-0 z-[1] border-b border-r border-border/50 bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.label}
                </div>
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "border-b border-r border-border/50 px-3 py-2 text-[10.5px] leading-snug text-foreground",
                      !same && "border-l-2 border-l-entity-mechanism/50",
                    )}
                  >
                    {same && (
                      <span className="mr-1 font-mono text-[8px] text-muted-foreground">≡</span>
                    )}
                    {r.values(p)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* differences + lessons */}
        <div className="max-w-3xl p-4">
          <span id="compare-key-differences" />
          <SectionTitle>Key differences</SectionTitle>
          <ul className="space-y-1.5">
            {diffs.map((d, i) => (
              <li key={i} className="text-[11px] leading-snug text-foreground">
                <DiffText text={d} />
              </li>
            ))}
          </ul>

          <SectionTitle>Potential lessons</SectionTitle>
          <ClaimList claims={lessonClaims} />

          <p className="mt-4 text-[9.5px] text-muted-foreground">
            Differences are computed from structured policy records. Lessons are limited to
            what linked evidence supports.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Render `**Bold.** rest` markers inside key-difference bullets. */
function DiffText({ text }: { text: string }) {
  const m = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-semibold text-foreground">{m[1]}</span>{" "}
      <span className="text-muted-foreground">{m[2]}</span>
    </>
  );
}
