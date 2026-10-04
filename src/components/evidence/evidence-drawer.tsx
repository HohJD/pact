"use client";

import { ExternalLink } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDataset } from "@/components/providers/dataset-provider";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "../panel/section-title";

const RELEVANCE_STYLE: Record<string, string> = {
  EVALUATES: "border-entity-policy/40 text-entity-policy",
  MONITORS: "border-entity-evidence/40 text-entity-evidence",
  CONTEXT: "border-border text-muted-foreground",
};

export function EvidenceDrawer() {
  const dataset = useDataset();
  const id = useWorkspace((s) => s.evidenceDrawerId);
  const closeEvidence = useWorkspace((s) => s.closeEvidence);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  const e = id ? dataset.evidence.find((x) => x.id === id) : null;

  return (
    <Sheet open={!!e} onOpenChange={(o) => !o && closeEvidence()}>
      <SheetContent
        side="right"
        className="w-[520px] overflow-y-auto border-l-border bg-card p-5 scrollbar-thin sm:max-w-[520px] [&>button]:text-muted-foreground"
      >
        {e && (
          <>
            <SheetHeader className="space-y-2 text-left">
              {e.data_status === "DEMO" && (
                <div className="rounded border border-entity-evidence/40 bg-entity-evidence/10 px-2.5 py-1.5 text-[10px] font-medium text-entity-evidence">
                  DEMO DATA — synthetic record for demonstration; not a real publication.
                </div>
              )}
              {e.data_status === "CANDIDATE" && (
                <div className="rounded border border-entity-mechanism/50 bg-entity-mechanism/10 px-2.5 py-1.5 text-[10px] font-medium text-entity-mechanism">
                  Found by web search and machine-classified from a snippet. Not
                  reviewed. Verify at source.
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1">
                <Chip className="border-border text-muted-foreground">
                  {e.evidence_type.replace(/_/g, " ")}
                </Chip>
                <Chip className="border-entity-evidence/40 text-entity-evidence">
                  {e.causal_strength.replace(/_/g, " ")}
                </Chip>
                <Chip className={RELEVANCE_STYLE[e.policy_relevance]}>
                  {e.policy_relevance}
                </Chip>
              </div>
              <SheetTitle className="text-[15px] leading-snug text-foreground">
                {e.title}
              </SheetTitle>
              <p className="font-mono text-[10px] text-muted-foreground">
                {e.publisher} · {e.publication_date}
                {e.authors.length > 0 && ` · ${e.authors.join(", ")}`}
              </p>
            </SheetHeader>

            <SectionTitle>Methodology</SectionTitle>
            <p className="text-[11.5px] text-foreground">{e.methodology}</p>

            <SectionTitle>Geography</SectionTitle>
            <div className="flex gap-1">
              {e.geography.length === 0 ? (
                <span className="text-[10px] text-muted-foreground">Not country-specific</span>
              ) : (
                e.geography.map((g) => (
                  <span
                    key={g}
                    className="rounded bg-entity-jurisdiction/15 px-1.5 py-0.5 font-mono text-[9px] text-entity-jurisdiction"
                  >
                    {g}
                  </span>
                ))
              )}
            </div>

            <SectionTitle>Findings</SectionTitle>
            <ul className="space-y-1">
              {e.findings.map((f, i) => (
                <li key={i} className="text-[11.5px] text-foreground">· {f}</li>
              ))}
            </ul>

            {e.limitations.length > 0 && (
              <>
                <SectionTitle>Limitations</SectionTitle>
                <ul className="space-y-1">
                  {e.limitations.map((l, i) => (
                    <li key={i} className="text-[10.5px] text-muted-foreground">· {l}</li>
                  ))}
                </ul>
              </>
            )}

            <SectionTitle>Metrics</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {e.metrics.map((m) => (
                <span
                  key={m}
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                >
                  {dataset.metrics.find((mm) => mm.id === m)?.name ?? m}
                </span>
              ))}
            </div>

            {e.policy_ids.length > 0 && (
              <>
                <SectionTitle>Linked policies</SectionTitle>
                <div className="flex flex-wrap gap-1">
                  {e.policy_ids.map((pid) => {
                    const p = dataset.policies.find((x) => x.id === pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          closeEvidence();
                          select({ kind: "policy", id: pid });
                          openPanel("DETAILS");
                        }}
                        className="rounded border border-entity-policy/40 px-1.5 py-0.5 font-mono text-[9px] text-entity-policy hover:bg-entity-policy/10"
                      >
                        {p?.short_name ?? p?.name ?? pid}
                      </button>
                    );
                  })}
                </div>
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
                Open source <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No verified link — verify at publisher before citing
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
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
