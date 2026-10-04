"use client";

import { ExternalLink, GitCompareArrows } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useDataset,
  useEvidenceStrength,
  usePolicy,
  useRepo,
} from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { EvidenceStrengthDots } from "./evidence-strength";
import { InferenceChip } from "./inference-chip";

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: "border-entity-outcome/40 text-entity-outcome",
  ANNOUNCED: "border-entity-policy/40 text-entity-policy",
  PAUSED: "border-entity-evidence/40 text-entity-evidence",
  CLOSED: "border-border text-muted-foreground",
  SUPERSEDED: "border-border text-muted-foreground",
};

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-[11px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

export function PolicyCard({ policyId }: { policyId: string }) {
  const dataset = useDataset();
  const repo = useRepo();
  const policy = usePolicy(policyId);
  const strength = useEvidenceStrength(policyId);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const compareIds = useWorkspace((s) => s.compareIds);
  const expandNode = useWorkspace((s) => s.expandNode);
  const collapseNode = useWorkspace((s) => s.collapseNode);
  const expanded = useWorkspace((s) => s.expanded);
  const setView = useWorkspace((s) => s.setView);
  const openEvidence = useWorkspace((s) => s.openEvidence);
  const openTransfer = useWorkspace((s) => s.openTransfer);

  if (!policy || !strength) return null;

  const outcomes = repo.getOutcomesForPolicy(policyId);
  const similar = repo.getSimilar(policyId, 4);
  const techs = dataset.technologies.filter((t) => policy.technology_ids.includes(t.id));
  const mechs = dataset.mechanisms.filter((m) => policy.mechanism_ids.includes(m.id));
  const inCompare = compareIds.includes(policyId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-entity-jurisdiction/40 font-mono text-[9px] text-entity-jurisdiction">
            {policy.country_code}
          </Badge>
          <Badge variant="outline" className={`font-mono text-[9px] ${STATUS_VARIANT[policy.status] ?? ""}`}>
            {policy.status}
          </Badge>
          {policy.data_status === "DEMO" && (
            <Badge className="bg-entity-evidence/20 font-mono text-[9px] text-entity-evidence hover:bg-entity-evidence/20">
              DEMO DATA
            </Badge>
          )}
        </div>

        <h2 className="mt-2 text-[15px] font-semibold leading-tight tracking-tight text-foreground">
          {policy.name}
        </h2>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Meta label="Introduced">{policy.introduced}{policy.ended ? ` – ${policy.ended}` : ""}</Meta>
          <Meta label="Sector">{policy.sector.toLowerCase().replace(/_/g, " ")}</Meta>
          <Meta label="Technologies">
            <span className="flex flex-wrap gap-1">
              {techs.map((t) => (
                <span key={t.id} className="rounded bg-entity-technology/15 px-1 text-[9px] text-entity-technology">
                  {t.name}
                </span>
              ))}
            </span>
          </Meta>
          <Meta label="Mechanisms">
            <span className="flex flex-wrap gap-1">
              {mechs.map((m) => (
                <span key={m.id} className="rounded bg-entity-mechanism/15 px-1 text-[9px] text-entity-mechanism">
                  {m.name}
                </span>
              ))}
            </span>
          </Meta>
          <Meta label="Target population">{policy.target_groups.join(", ")}</Meta>
          <Meta label="Eligibility">{policy.eligibility}</Meta>
          <Meta label="Financial incentive">{policy.incentive}</Meta>
          <Meta label="Funding">{policy.funding}</Meta>
        </dl>

        <p className="mt-3 text-dense text-muted-foreground">{policy.description}</p>

        {policy.objectives.length > 0 && (
          <>
            <SectionTitle>Objectives</SectionTitle>
            <ul className="space-y-1">
              {policy.objectives.map((o, i) => (
                <li key={i} className="text-[11px] text-foreground">· {o}</li>
              ))}
            </ul>
          </>
        )}

        <Separator className="my-3" />

        <button
          type="button"
          className="w-full text-left"
          onClick={() => openPanel("EVIDENCE")}
        >
          <SectionTitle>Evidence strength</SectionTitle>
          <EvidenceStrengthDots strength={strength} />
        </button>

        {outcomes.length > 0 && (
          <>
            <SectionTitle>Observed outcomes</SectionTitle>
            <ul className="space-y-2">
              {outcomes.map((o) => (
                <li key={o.id} className="rounded border border-border/60 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-snug text-foreground">{o.headline}</p>
                    <InferenceChip inference={o.inference} />
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {o.magnitude ? `${o.magnitude} · ` : ""}{o.period}
                  </p>
                  {o.evidence_ids.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {o.evidence_ids.map((eid) => (
                        <button
                          key={eid}
                          type="button"
                          onClick={() => openEvidence(eid)}
                          className="rounded border border-entity-evidence/30 px-1 font-mono text-[8px] text-entity-evidence hover:bg-entity-evidence/10"
                        >
                          source
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {similar.length > 0 && (
          <>
            <SectionTitle>Related policies</SectionTitle>
            <ul className="space-y-1">
              {similar.map((s) => {
                const otherId = s.policy_a === policyId ? s.policy_b : s.policy_a;
                const other = dataset.policies.find((p) => p.id === otherId);
                if (!other) return null;
                return (
                  <li key={s.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        select({ kind: "policy", id: otherId });
                        openPanel("DETAILS");
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between rounded px-1.5 py-1 text-left hover:bg-secondary"
                    >
                      <span className="truncate text-[11px] text-foreground">
                        {other.short_name ?? other.name}
                      </span>
                      <span className="font-mono text-[9px] text-entity-policy">
                        {Math.round(s.breakdown.overall * 100)}%
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        select({ kind: "edge", id: `e_${s.id}` });
                        openPanel("SIMILARITY");
                      }}
                      className="shrink-0 rounded border border-border px-1 py-0.5 font-mono text-[8px] text-muted-foreground hover:text-foreground"
                    >
                      Why?
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {policy.sources.length > 0 && (
          <>
            <SectionTitle>Sources</SectionTitle>
            <ul className="space-y-1">
              {policy.sources.map((s, i) => (
                <li key={i} className="text-[10px] text-muted-foreground">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-entity-policy hover:underline"
                    >
                      {s.label} <ExternalLink className="size-2.5" />
                    </a>
                  ) : (
                    <span>{s.publisher} — no verified link</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* sticky action bar */}
      <div className="grid grid-cols-4 gap-1 border-t border-border bg-card p-2">
        <Button
          size="sm"
          variant={inCompare ? "default" : "outline"}
          className="h-7 px-1 text-[9px]"
          onClick={() => toggleCompare(policyId)}
        >
          <GitCompareArrows className="size-3" />
          Compare{compareIds.length > 0 ? ` ${compareIds.length}` : ""}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-1 text-[9px]" onClick={() => openPanel("EVIDENCE")}>
          Evidence
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-1 text-[9px]"
          onClick={() => {
            openPanel("OUTCOMES");
            setView("OUTCOMES");
          }}
        >
          Outcomes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-1 text-[9px]"
          onClick={() =>
            expanded.has(policyId) ? collapseNode(policyId) : expandNode(policyId)
          }
        >
          {expanded.has(policyId) ? "Collapse" : "Expand"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="col-span-4 h-7 px-1 text-[9px]"
          onClick={() =>
            openTransfer({
              target_jurisdiction_id: "jur_gb_oxford",
              source_policy_ids: [policyId],
            })
          }
        >
          Policy transfer — assess fit for another jurisdiction
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}
