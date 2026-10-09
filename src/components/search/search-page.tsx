"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { Loader2, Scale, Search } from "lucide-react";

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
  "heat pump grants",
  "insulation subsidies for low-income households",
  "Which policies accelerated heat-pump adoption?",
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
  const [weightsOpen, setWeightsOpen] = useState(false);
  const prefs = useSimilarityPrefs();
  const seq = useRef(0);

  const run = useCallback(
    async (q: string) => {
      const id = ++seq.current;
      setLoading(true);
      setSelectedId(null);
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
    },
    [],
  );

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
    for (const l of links) {
      if (l.source === selectedId) m.set(l.target, l.score);
      else if (l.target === selectedId) m.set(l.source, l.score);
    }
    return m;
  }, [links, selectedId]);

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
            <ul className="list-disc space-y-1 pl-5 text-[11px] text-muted-foreground">
              <li>Full-text search in {dataset.policies.length} policies</li>
              <li>Semantic similarity (local embeddings)</li>
              <li>Ranking by relevance</li>
              <li>Building similarity tangle</li>
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
            <p className="mt-4 text-[11px] text-muted-foreground">
              {result.policies.length} of {result.total_searched} policies
              {result.semantic ? "" : " · semantic unavailable, lexical only"}
            </p>
            <div className="mt-3 flex items-start gap-5">
              <div className="w-[55%] shrink-0">
                <Tangle
                  nodes={tangleNodes}
                  links={links}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onLinkClick={(a, b) => router.push(`/compare/${a}/${b}`)}
                />
              </div>
              <div className="max-h-[760px] min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <AnalystSummary key={result.query} query={result.query} />
                {rows.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">
                    No data found
                  </p>
                )}
                <ul className="space-y-1">
                  {rows.map((p) => {
                    const sim = simToSelected?.get(p.id);
                    return (
                      <li key={p.id} data-sim={sim ? simBand(sim) : undefined}>
                        <Link
                          href={`/policy/${p.id}`}
                          title={p.name}
                          className={cn(
                            "flex items-baseline gap-2 rounded px-2 py-1.5 text-[12px] leading-snug hover:bg-secondary/60",
                            selectedId === p.id && "font-medium",
                          )}
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
