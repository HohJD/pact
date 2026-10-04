"use client";

import { useState } from "react";

import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";

import type { Evidence } from "@/lib/domain/schema";
import {
  useDataset,
  useEvidenceStrength,
  useRepo,
} from "@/components/providers/dataset-provider";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { EvidenceStrengthDots } from "./evidence-strength";
import { SectionTitle } from "./section-title";

const RELEVANCE_STYLE: Record<string, string> = {
  EVALUATES: "border-entity-policy/40 text-entity-policy",
  MONITORS: "border-entity-evidence/40 text-entity-evidence",
  CONTEXT: "border-border text-muted-foreground",
};

export function EvidencePanel({ policyId }: { policyId?: string }) {
  const repo = useRepo();
  const dataset = useDataset();
  const strength = useEvidenceStrength(policyId);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);

  const list = policyId
    ? repo.getEvidenceForPolicy(policyId)
    : dataset.evidence;

  const detailId = selection?.kind === "evidence" ? selection.id : null;
  const detail = detailId ? dataset.evidence.find((e) => e.id === detailId) : null;

  if (detail) return <EvidenceDetail evidence={detail} />;

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      {policyId && strength && (
        <>
          <SectionTitle>Evidence strength</SectionTitle>
          <EvidenceStrengthDots strength={strength} showSummary={false} />
        </>
      )}
      <SectionTitle>{list.length} records</SectionTitle>
      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => select({ kind: "evidence", id: e.id })}
              className="w-full rounded border border-border/60 p-2 text-left hover:border-foreground/30"
            >
              <div className="flex flex-wrap items-center gap-1">
                <Chip className="border-border text-muted-foreground">
                  {e.evidence_type.replace(/_/g, " ")}
                </Chip>
                <Chip className="border-entity-evidence/40 text-entity-evidence">
                  {e.causal_strength.replace(/_/g, " ")}
                </Chip>
                <Chip className={RELEVANCE_STYLE[e.policy_relevance]}>{e.policy_relevance}</Chip>
                {e.data_status === "DEMO" && (
                  <span className="rounded bg-entity-evidence/20 px-1 font-mono text-[8px] text-entity-evidence">
                    DEMO DATA
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
                {e.title}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                {e.publisher} · {e.publication_date}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}

function EvidenceDetail({ evidence: e }: { evidence: Evidence }) {
  const dataset = useDataset();
  const select = useWorkspace((s) => s.select);
  const [showLimits, setShowLimits] = useState(false);

  const discussed = dataset.policies.filter((p) => e.policy_ids.includes(p.id));

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <button
        type="button"
        onClick={() => select(discussed[0] ? { kind: "policy", id: discussed[0].id } : null)}
        className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back
      </button>

      <div className="flex flex-wrap items-center gap-1">
        <Chip className={RELEVANCE_STYLE[e.policy_relevance]}>{e.policy_relevance}</Chip>
        <Chip className="border-entity-evidence/40 text-entity-evidence">
          {e.causal_strength.replace(/_/g, " ")}
        </Chip>
        {e.data_status === "DEMO" && (
          <span className="rounded bg-entity-evidence/20 px-1 font-mono text-[8px] text-entity-evidence">
            DEMO DATA
          </span>
        )}
      </div>

      <h2 className="mt-2 text-[13px] font-semibold leading-snug text-foreground">{e.title}</h2>
      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
        {e.publisher} · {e.publication_date}
        {e.authors.length > 0 && ` · ${e.authors.join(", ")}`}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{e.methodology}</p>

      <SectionTitle>Findings</SectionTitle>
      <ul className="space-y-1">
        {e.findings.map((f, i) => (
          <li key={i} className="text-[11px] text-foreground">· {f}</li>
        ))}
      </ul>

      {e.limitations.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowLimits((v) => !v)}
            className="mt-3 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            Limitations
            <ChevronDown className={cn("size-3 transition-transform", showLimits && "rotate-180")} />
          </button>
          {showLimits && (
            <ul className="mt-1 space-y-1">
              {e.limitations.map((l, i) => (
                <li key={i} className="text-[10px] text-muted-foreground">· {l}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {discussed.length > 0 && (
        <>
          <SectionTitle>Discusses policies</SectionTitle>
          <ul className="space-y-0.5">
            {discussed.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: "policy", id: p.id })}
                  className="w-full truncate rounded px-1.5 py-1 text-left text-[11px] text-foreground hover:bg-secondary"
                >
                  {p.short_name ?? p.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Source</SectionTitle>
      {e.source_url ? (
        <a
          href={e.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-entity-policy hover:underline"
        >
          {e.publisher} <ExternalLink className="size-3" />
        </a>
      ) : (
        <p className="text-[10px] text-muted-foreground">No verified link</p>
      )}
    </div>
  );
}
