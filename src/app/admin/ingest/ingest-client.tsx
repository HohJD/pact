"use client";

import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Dataset } from "@/lib/domain/schema";
import type { IngestJob } from "@/lib/ingest/jobs";
import { STAGES } from "@/lib/ingest/pipeline";
import { explainSimilarity } from "@/lib/similarity/engine";
import { cn } from "@/lib/utils";

const SAMPLE = `In 2024 Germany reformed its Buildings Energy Act subsidy programme. The BEG
individual measures scheme now offers a 30% base grant for heat pumps, with a
20% climate-speed bonus for early adopters and a 30% income bonus for households
below a defined threshold, capped at €21,000. The scheme is funded federally and
administered by KfW. Heat-pump sales fell sharply in early 2024 amid the budget
crisis and lower gas prices, according to industry association BWP.`;

export function IngestClient({ dataset }: { dataset: Dataset }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState(SAMPLE);
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<IngestJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = (id: string) => {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/ingest/${id}`);
      const j = (await res.json()) as IngestJob;
      setJob(j);
      if (j.status !== "RUNNING" && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 800);
  };

  const submit = async (kind: "URL" | "TEXT" | "PDF") => {
    setBusy(true);
    setJob(null);
    setPublished(null);
    try {
      let res: Response;
      if (kind === "PDF") {
        const form = new FormData();
        if (file) form.append("file", file);
        res = await fetch("/api/ingest", { method: "POST", body: form });
      } else {
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "URL" ? { kind, url } : { kind, text, label: "pasted text" },
          ),
        });
      }
      const { id } = (await res.json()) as { id: string };
      poll(id);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: "publish" | "reject") => {
    if (!job) return;
    const res = await fetch(`/api/ingest/${job.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const j = await res.json();
    if (decision === "publish") setPublished(j.policy_id ?? "ok");
    setJob((prev) => (prev ? { ...prev, status: j.status } : prev));
  };

  // dataset + drafted policy so explainSimilarity can resolve both sides
  const draftPolicy = job?.draft?.policy ?? null;
  const extDataset = useMemo(
    () =>
      draftPolicy
        ? { ...dataset, policies: [...dataset.policies, draftPolicy] }
        : dataset,
    [dataset, draftPolicy],
  );

  const stageIndex = (name: string) => job?.stagesDone.includes(name as never);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* admin strip */}
      <div className="mb-4 flex items-center justify-between border-b border-amber-500/40 bg-amber-500/10 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-400">
          Internal — admin
        </span>
        <a href="/workspace" className="font-mono text-[10px] text-muted-foreground hover:text-foreground">
          → workspace
        </a>
      </div>

      <h1 className="text-sm font-semibold">Policy ingestion</h1>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Extract a policy record from a source document. Everything is drafted as
        DEMO data until a human reviews and publishes it.
      </p>

      <Tabs defaultValue="text" className="mt-4">
        <TabsList>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="text">Plain text</TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="space-y-2">
          <Input
            placeholder="https://example.gov/policy-page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button size="sm" disabled={busy || !url} onClick={() => submit("URL")}>
            Fetch & extract
          </Button>
        </TabsContent>
        <TabsContent value="pdf" className="space-y-2">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button size="sm" disabled={busy || !file} onClick={() => submit("PDF")}>
            Upload & extract
          </Button>
        </TabsContent>
        <TabsContent value="text" className="space-y-2">
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-[12px]"
          />
          <Button size="sm" disabled={busy || !text.trim()} onClick={() => submit("TEXT")}>
            Extract
          </Button>
        </TabsContent>
      </Tabs>

      {/* stepper */}
      {job && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-y-2">
            {STAGES.map((s, i) => {
              const doneStage = stageIndex(s);
              const running =
                job.status === "RUNNING" &&
                !doneStage &&
                (i === 0 || stageIndex(STAGES[i - 1]));
              return (
                <div key={s} className="flex items-center">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider",
                      doneStage
                        ? "bg-entity-outcome/15 text-entity-outcome"
                        : running
                          ? "animate-pulse bg-entity-policy/15 text-entity-policy"
                          : "bg-secondary text-muted-foreground/50",
                    )}
                  >
                    {s}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span className="mx-0.5 text-muted-foreground/40">→</span>
                  )}
                </div>
              );
            })}
          </div>

          {job.status === "NEEDS_PROVIDER" && (
            <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
              {job.draft?.warnings[0] ??
                "Provider not configured — extraction stopped after chunking."}
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                {job.draft?.chunkCount} chunks · {job.draft?.textLength} chars
              </span>
            </div>
          )}
          {job.status === "ERROR" && (
            <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {job.error}
            </div>
          )}

          {job.draft?.warnings.slice(1).map((w, i) => (
            <p key={i} className="mt-1.5 font-mono text-[9px] text-amber-400/80">
              ⚠ {w}
            </p>
          ))}

          {/* review */}
          {job.status === "IN_REVIEW" && job.draft?.policy && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Extracted record
                  </span>
                  <Badge variant="outline" className="text-amber-400">
                    DEMO until published
                  </Badge>
                </div>
                {(
                  [
                    ["name", job.draft.policy.name],
                    ["jurisdiction", extDataset.jurisdictions.find((j) => j.id === job.draft!.policy!.jurisdiction_id)?.name],
                    ["status", job.draft.policy.status],
                    ["introduced", job.draft.policy.introduced],
                    ["sector", job.draft.policy.sector],
                    ["mechanisms", job.draft.policy.mechanism_ids.join(", ")],
                    ["technologies", job.draft.policy.technology_ids.join(", ")],
                    ["eligibility", job.draft.policy.eligibility],
                    ["incentive", job.draft.policy.incentive],
                    ["funding", job.draft.policy.funding],
                    ["description", job.draft.policy.description],
                  ] as const
                ).map(([fieldKey, value]) => {
                  const prov =
                    job.draft!.provenance[
                      fieldKey === "name"
                        ? "policy_name"
                        : fieldKey === "incentive"
                          ? "incentives"
                          : fieldKey
                    ];
                  return (
                    <div key={fieldKey} className="mb-1.5" title={prov?.quote ? `“${prov.quote}” (chunk ${prov.chunk_index})` : "no provenance"}>
                      <div className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">
                        {fieldKey}
                      </div>
                      <div className="text-[11px] leading-snug text-foreground">
                        {value || "—"}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => decide("publish")}>
                    Publish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide("reject")}>
                    Reject
                  </Button>
                </div>
                {published && (
                  <p className="mt-2 font-mono text-[9px] text-entity-outcome">
                    Published as {published} — visible in the workspace until the
                    server restarts (seed mode).
                  </p>
                )}
              </div>

              <div className="surface p-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Similar seeded policies
                </span>
                {job.draft.similar.length === 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No similar policies found (threshold 0.5).
                  </p>
                )}
                {job.draft.similar.map((s) => {
                  const other = dataset.policies.find((p) => p.id === s.policy_b);
                  const rows = explainSimilarity(s, extDataset);
                  return (
                    <div key={s.id} className="mt-3 border-t border-border/50 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium">
                          {other?.short_name ?? other?.name ?? s.policy_b}
                        </span>
                        <span className="font-mono text-[10px] text-entity-similarity">
                          {Math.round(s.breakdown.overall * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {rows.map((r) => (
                          <div key={r.label} className="flex justify-between font-mono text-[8.5px]">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span className={r.status === "same" ? "text-entity-outcome" : "text-muted-foreground"}>
                              {r.status === "same" ? "✓" : "△"} {r.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {job.status === "PUBLISHED" && !job.draft?.policy && null}
        </div>
      )}
    </div>
  );
}
