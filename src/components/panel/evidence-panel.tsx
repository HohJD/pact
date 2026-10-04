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

export function EvidencePanel({
  policyId,
  hideAgent = false,
}: {
  policyId?: string;
  hideAgent?: boolean;
}) {
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
          <p className="mb-2 font-mono text-[9px] text-muted-foreground">
            {strength.counts.evaluates} evaluates · {strength.counts.monitors} monitors ·{" "}
            {strength.counts.context} context · {strength.counts.demo} demo
            {strength.counts.candidate > 0 &&
              ` · ${strength.counts.candidate} candidate`}
          </p>
        </>
      )}
      {policyId && !hideAgent && <EvidenceAgentSection policyId={policyId} />}
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
                {e.data_status === "CANDIDATE" && (
                  <span className="rounded border border-entity-mechanism/50 px-1 font-mono text-[8px] text-entity-mechanism">
                    CANDIDATE
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
        {e.data_status === "CANDIDATE" && (
          <span className="rounded border border-entity-mechanism/50 px-1 font-mono text-[8px] text-entity-mechanism">
            CANDIDATE
          </span>
        )}
      </div>

      {e.data_status === "CANDIDATE" && (
        <div className="mt-2 rounded border border-entity-mechanism/50 bg-entity-mechanism/10 px-2.5 py-1.5 text-[10px] text-entity-mechanism">
          Found by web search and machine-classified from a snippet. Not
          reviewed. Verify at source.
        </div>
      )}

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

const AGENT_STAGES = ["Search", "Classify", "Link"] as const;

interface AgentResult {
  status: string;
  candidates: Evidence[];
  candidates_unclassified: { title: string; url: string; snippet: string }[];
  notes: string[];
  source: "LIVE" | "NONE";
}

/** "Find external evidence" — Tavily-backed search → classify → link. */
function EvidenceAgentSection({ policyId }: { policyId: string }) {
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const addCandidate = useWorkspace((s) => s.addCandidateEvidence);
  const openEvidence = useWorkspace((s) => s.openEvidence);

  const run = async () => {
    setRunning(true);
    setStage(0);
    setResult(null);
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 1800);
    try {
      const res = await fetch("/api/evidence-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: policyId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AgentResult;
      setResult(data);
      setStage(2);
    } catch {
      setResult({ status: "ERROR", candidates: [], candidates_unclassified: [], notes: ["Request failed."], source: "NONE" });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setRunning(false);
    }
  };

  const add = async (e: Evidence) => {
    addCandidate(e);
    setAdded((s) => new Set(s).add(e.id));
    try {
      await fetch("/api/evidence-agent/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
    } catch {
      // session copy is already added — persistence is best-effort
    }
  };

  return (
    <div className="mb-3 rounded border border-border/60 p-2.5">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded border border-entity-policy/40 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-entity-policy hover:bg-entity-policy/10 disabled:opacity-50"
      >
        {running ? "Searching…" : "Find external evidence"}
      </button>

      {running && (
        <div className="mt-2 flex items-center gap-1.5">
          {AGENT_STAGES.map((s, i) => (
            <span
              key={s}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider",
                i <= stage
                  ? "border-entity-policy/40 text-entity-policy"
                  : "border-border text-muted-foreground",
                i === stage && "animate-pulse",
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {result && !running && (
        <div className="mt-2">
          {result.candidates.length > 0 && (
            <>
              <p className="rounded border border-entity-mechanism/50 bg-entity-mechanism/10 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-entity-mechanism">
                Candidate evidence — found via web search, unreviewed, not
                counted in strength
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {result.candidates.map((e) => (
                  <li
                    key={e.id}
                    className="rounded border border-dashed border-entity-mechanism/50 p-2"
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <Chip className="border-border text-muted-foreground">
                        {e.evidence_type.replace(/_/g, " ")}
                      </Chip>
                      <Chip className="border-entity-evidence/40 text-entity-evidence">
                        {e.causal_strength.replace(/_/g, " ")}
                      </Chip>
                      <Chip className="border-entity-mechanism/50 text-entity-mechanism">
                        CANDIDATE
                      </Chip>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // the drawer reads the merged dataset — add first
                        addCandidate(e);
                        openEvidence(e.id);
                      }}
                      className="mt-1 line-clamp-2 text-left text-[11px] font-medium leading-snug text-foreground hover:underline"
                    >
                      {e.title}
                    </button>
                    <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      {e.publisher}
                    </p>
                    {e.findings.slice(0, 2).map((f, i) => (
                      <p key={i} className="mt-0.5 text-[10px] text-muted-foreground">
                        · {f}
                      </p>
                    ))}
                    <div className="mt-1.5 flex items-center gap-2">
                      {e.source_url && (
                        <a
                          href={e.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9.5px] text-entity-policy hover:underline"
                        >
                          Open source <ExternalLink className="size-2.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={added.has(e.id)}
                        onClick={() => void add(e)}
                        className="rounded border border-entity-mechanism/50 px-1.5 py-0.5 font-mono text-[8px] uppercase text-entity-mechanism hover:bg-entity-mechanism/10 disabled:opacity-50"
                      >
                        {added.has(e.id) ? "Added" : "Add to workspace"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.candidates_unclassified.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {result.candidates_unclassified.map((h) => (
                <li key={h.url} className="text-[10px]">
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-entity-policy hover:underline"
                  >
                    {h.title}
                  </a>
                  <span className="text-muted-foreground"> — unclassified</span>
                </li>
              ))}
            </ul>
          )}
          {result.candidates.length === 0 &&
            result.candidates_unclassified.length === 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {result.notes[result.notes.length - 1] ?? "No external evidence found."}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
