"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import {
  Check,
  Crosshair,
  GitCompare,
  Loader2,
  Scale,
  Search,
} from "lucide-react";

import { storeLastQuery } from "@/components/back-to-results";
import { Flag } from "@/components/flag";
import { useDataset } from "@/components/providers/dataset-provider";
import { AnalystSummary } from "@/components/search/summary";
import { Tangle } from "@/components/search/tangle";
import { WeightsDialog } from "@/components/search/weights-dialog";
import { Button } from "@/components/ui/button";
import type { Policy, Similarity } from "@/lib/domain/schema";
import {
  storeSimilarityPrefs,
  useSimilarityPrefs,
} from "@/lib/similarity/prefs";
import { rescoreSimilarity } from "@/lib/similarity/structured";
import { cn } from "@/lib/utils";

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

export function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const dataset = useDataset();
  const jurisdictionName = useCallback(
    (id: string) =>
      dataset.jurisdictions.find((j) => j.id === id)?.name ?? null,
    [dataset],
  );

  const [input, setInput] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const prefs = useSimilarityPrefs();
  const seq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = [
    `Full-text search in ${dataset.policies.length} policies`,
    "Semantic similarity (local embeddings)",
    "Ranking by relevance",
    "Building similarity tangle",
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

  // submit → update the URL (and run); back/forward re-runs via ?q=
  const submit = (q = input) => {
    const t = q.trim();
    if (!t) return;
    setInput(t);
    router.push(`/?q=${encodeURIComponent(t)}`);
  };

  useEffect(() => {
    const q = params.get("q");
    if (!q) return;
    const frame = window.requestAnimationFrame(() => void run(q));
    return () => window.cancelAnimationFrame(frame);
  }, [params, run]);

  // "/" focuses the search box; Escape clears the tangle selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const links = useMemo(
    () =>
      (result?.similarities ?? [])
        .map((s) => ({
          source: s.policy_a,
          target: s.policy_b,
          score: rescored.get([s.policy_a, s.policy_b].sort().join("|")) ?? 0,
        }))
        .filter((l) => l.score * 100 >= prefs.threshold),
    [result, rescored, prefs.threshold],
  );

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

  const tangleNodes = useMemo(
    () =>
      (result?.policies ?? []).map((p) => ({
        id: p.id,
        title: p.name,
        short_name: p.short_name,
        country_code: p.country_code,
        country_name: jurisdictionName(p.jurisdiction_id),
        year: p.introduced?.slice(0, 4),
        status: p.status,
        imported: p.data_status === "IMPORTED",
        score: p.score,
      })),
    [result, jurisdictionName],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-5 py-6">
        <h1 className="mb-4 font-mono text-lg font-semibold tracking-wide">
          Search
        </h1>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search climate policies — keywords or a question"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-entity-policy"
          />
          <Button type="submit" size="sm" className="h-9" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-1.5">Search</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setWeightsOpen(true)}
          >
            <Scale className="mr-1.5 h-3.5 w-3.5" />
            Similarity weights
          </Button>
        </form>

        {loading && (
          <div className="mt-6 rounded border border-entity-policy/30 bg-entity-policy/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching for “{input}”
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

        {!loading && !result && (
          <div className="mt-6 rounded border border-border bg-secondary/30 p-4">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Try
            </p>
            <ul className="space-y-1.5 text-[12px]">
              {EXAMPLES.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    className="text-entity-policy hover:underline"
                    onClick={() => submit(e)}
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {result.policies.length} of {result.total_searched} policies ·
                semantic match {result.semantic ? "on" : "off"}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Click a title to open · click a circle to rank by similarity
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="w-full shrink-0 max-lg:max-h-[420px] max-lg:overflow-hidden lg:w-[55%]">
                <Tangle
                  nodes={tangleNodes}
                  links={links}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={setSelectedId}
                  onLinkClick={(a, b) => router.push(`/compare/${a}/${b}`)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-3 lg:max-h-[760px] lg:overflow-y-auto lg:pr-1">
                <AnalystSummary key={result.query} query={result.query} />
                {rows.length === 0 && (
                  <div className="rounded border border-border bg-secondary/30 p-4">
                    <p className="text-[12px] text-muted-foreground">
                      No policies matched “{result.query}”
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[12px]">
                      {EXAMPLES.map((e) => (
                        <li key={e}>
                          <button
                            type="button"
                            className="text-entity-policy hover:underline"
                            onClick={() => submit(e)}
                          >
                            {e}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-1">
                  {rows.map((p) => {
                    const sim = simToSelected?.get(p.id);
                    const isSel = selectedId === p.id;
                    return (
                      <li
                        key={p.id}
                        data-sim={sim != null ? simBand(sim) : undefined}
                        onMouseEnter={() => setHoveredId(p.id)}
                        onMouseLeave={() =>
                          setHoveredId((h) => (h === p.id ? null : h))
                        }
                      >
                        <div
                          className={cn(
                            "group flex cursor-pointer items-baseline gap-2 rounded px-2 py-1.5 text-[12px] leading-snug hover:bg-secondary/60",
                            isSel && "font-medium",
                          )}
                        >
                          <Link
                            href={`/policy/${p.id}`}
                            title={p.name}
                            className="flex min-w-0 flex-1 items-baseline gap-2"
                          >
                            <Flag code={p.country_code} />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1">{p.name}</span>
                              {p.short_name && (
                                <span className="ml-1.5 rounded border border-border px-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                  {p.short_name}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {p.introduced?.slice(0, 4)}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] uppercase text-muted-foreground">
                              {p.status}
                            </span>
                          </Link>
                          {selectedId && (
                            <span className="flex shrink-0 items-center gap-1.5">
                              {isSel ? (
                                <span className="rounded border border-entity-policy/50 bg-entity-policy/10 px-1 font-mono text-[8px] uppercase tracking-wider text-entity-policy">
                                  selected
                                </span>
                              ) : (
                                <>
                                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                    {sim != null ? Math.round(sim * 100) : "–"}
                                  </span>
                                  <Link
                                    href={`/compare/${selectedId}/${p.id}`}
                                    title={`Compare ${selectedId} ↔ ${p.id}`}
                                    className="text-muted-foreground hover:text-entity-policy"
                                    aria-label={`Compare with ${p.short_name ?? p.name}`}
                                  >
                                    <GitCompare className="h-3.5 w-3.5" />
                                  </Link>
                                </>
                              )}
                            </span>
                          )}
                          <button
                            type="button"
                            title="Select in tangle"
                            aria-label={`Select ${p.short_name ?? p.name}`}
                            onClick={() => setSelectedId(isSel ? null : p.id)}
                            className="shrink-0 self-center text-muted-foreground transition-opacity hover:text-entity-policy lg:opacity-0 lg:group-hover:opacity-100"
                          >
                            <Crosshair className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      <WeightsDialog
        open={weightsOpen}
        onOpenChange={setWeightsOpen}
        onApply={storeSimilarityPrefs}
      />
    </div>
  );
}
