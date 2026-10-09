import { NextResponse } from "next/server";

import { loadDataset } from "@/lib/data";
import type { Similarity } from "@/lib/domain/schema";
import { searchCatalogue } from "@/lib/search/catalogue";
import { embedQuery, policyEmbeddingScores, rankPolicies } from "@/lib/search/rank";
import { structuredSimilarity } from "@/lib/similarity/structured";
import { semanticScores } from "@/data/seed/semantic";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TOP_N = 30;

function pairId(a: string, b: string) {
  return `sim_${[a, b].sort().join("_")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const includeImported = url.searchParams.get("imported") !== "0";
  if (!q) {
    return NextResponse.json({
      query: q,
      policies: [],
      similarities: [],
      total_searched: 0,
      semantic: false,
    });
  }

  const dataset = await loadDataset();
  const pool = includeImported
    ? dataset.policies
    : dataset.policies.filter((p) => p.data_status !== "IMPORTED");

  // query embedding via the local MiniLM path (same as `pnpm embed`) — the
  // chat provider may not offer embeddings
  const qv = await embedQuery(q);
  const emb = qv ? policyEmbeddingScores(qv) : null;

  const lexical = searchCatalogue(dataset, q).scores;
  const poolIds = new Set(pool.map((p) => p.id));
  const scored = rankPolicies(q, dataset, {
    lexicalScores: lexical,
    emb,
    include_imported: includeImported,
  })
    .filter((r) => poolIds.has(r.policy.id) && r.score > 0)
    .slice(0, TOP_N);

  const policies = scored.map(({ policy: p, score }) => ({
    id: p.id,
    name: p.name,
    short_name: p.short_name ?? null,
    jurisdiction_id: p.jurisdiction_id,
    country_code: p.country_code,
    introduced: p.introduced,
    ended: p.ended,
    status: p.status,
    data_status: p.data_status,
    description: p.description.slice(0, 200),
    sector: p.sector,
    mechanism_ids: p.mechanism_ids,
    technology_ids: p.technology_ids,
    score,
  }));

  // tangle edges: stored pairs between results first; missing pairs are
  // computed with structuredSimilarity so the diagram is never empty
  const resultIds = new Set(policies.map((p) => p.id));
  const byId = new Map(pool.map((p) => [p.id, p]));
  const similarities: Similarity[] = dataset.similarities.filter(
    (s) => resultIds.has(s.policy_a) && resultIds.has(s.policy_b),
  );
  const havePair = new Set(
    similarities.map((s) => [s.policy_a, s.policy_b].sort().join("|")),
  );
  const ids = [...resultIds];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      if (havePair.has([a, b].sort().join("|"))) continue;
      const pa = byId.get(a);
      const pb = byId.get(b);
      if (!pa || !pb) continue;
      similarities.push({
        id: pairId(a, b),
        policy_a: a,
        policy_b: b,
        breakdown: structuredSimilarity(
          pa,
          pb,
          dataset.jurisdictions,
          semanticScores[[a, b].sort().join("|")],
        ),
      });
    }
  }

  return NextResponse.json({
    query: q,
    policies,
    similarities,
    total_searched: pool.length,
    semantic: emb !== null,
  });
}
