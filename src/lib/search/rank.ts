import { readFileSync } from "node:fs";
import path from "node:path";

import type { Dataset, Policy } from "@/lib/domain/schema";

interface EmbeddingsFile {
  model: string;
  dims: number;
  policies: Record<string, number[]>;
  evidence: Record<string, number[]>;
}

export function loadEmbeddings(): EmbeddingsFile | null {
  try {
    const p = path.join(process.cwd(), "src/data/seed/embeddings.json");
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

let extractorPromise: Promise<
  (
    texts: string[],
    options: { pooling: "mean"; normalize: true },
  ) => Promise<{ tolist(): number[][] }>
> | null = null;

/**
 * Local MiniLM query embedding — same model as `pnpm embed`
 * (Xenova/all-MiniLM-L6-v2, 384 dims). Returns null when the model can't load.
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const { pipeline } = await import("@huggingface/transformers");
    extractorPromise ??= pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    ) as unknown as typeof extractorPromise;
    const extractor = await extractorPromise!;
    const out = await extractor([text], { pooling: "mean", normalize: true });
    const vec = out.tolist()[0];
    return vec?.length ? vec : null;
  } catch {
    return null;
  }
}

/** Cosine similarity of a query vector against stored policy embeddings. */
export function policyEmbeddingScores(
  queryVector: number[],
): Record<string, number> | null {
  const embFile = loadEmbeddings();
  if (!embFile) return null;
  const compatible = Object.entries(embFile.policies).filter(
    ([, vector]) => vector.length === queryVector.length,
  );
  if (!compatible.length) return null;
  return Object.fromEntries(
    compatible.map(([id, vector]) => [id, cosine(queryVector, vector)]),
  );
}

export interface RankOptions {
  /** lexical scores per policy id (e.g. MiniSearch hits) — normalised internally */
  lexicalScores?: Map<string, number>;
  /** query-resolver hints */
  hintTechnologyIds?: Set<string>;
  hintMechanismIds?: Set<string>;
  hintCountries?: Set<string>;
  /** always-surface ids (workspace selection / compare tray) */
  pinnedPolicyIds?: Set<string>;
  /** ids with a full-text document hit */
  documentPolicyIds?: Set<string>;
  /** per-policy cosine score of the query embedding (null → lexical only) */
  emb?: Record<string, number> | null;
  /** exclude IMPORTED catalogue-import rows when false (default true) */
  include_imported?: boolean;
}

/**
 * Shared policy scoring used by the analyst's retrieval and the /api/search
 * endpoint: lexical blend + query hints + popularity nudges + optional
 * embedding blend. Scores are normalised to [0,1] (max = 1) and sorted desc.
 */
export function rankPolicies(
  question: string,
  dataset: Dataset,
  opts: RankOptions = {},
): { policy: Policy; score: number }[] {
  const lexScores = opts.lexicalScores ?? new Map<string, number>();
  const maxLexicalScore = Math.max(0, ...lexScores.values());
  const hintTech = opts.hintTechnologyIds ?? new Set<string>();
  const hintMech = opts.hintMechanismIds ?? new Set<string>();
  const hintCountry = opts.hintCountries ?? new Set<string>();
  const pinned = opts.pinnedPolicyIds ?? new Set<string>();
  const documentPolicyIds = opts.documentPolicyIds ?? new Set<string>();
  const emb = opts.emb ?? null;

  const pool =
    opts.include_imported === false
      ? dataset.policies.filter((p) => p.data_status !== "IMPORTED")
      : dataset.policies;
  const scored = pool.map((p) => {
    const lex =
      maxLexicalScore > 0
        ? (6 * (lexScores.get(p.id) ?? 0)) / maxLexicalScore
        : 0;
    let score = lex * 0.5;
    if (p.technology_ids.some((t) => hintTech.has(t))) score += 2;
    if (p.mechanism_ids.some((m) => hintMech.has(m))) score += 2;
    if (hintCountry.has(p.country_code)) score += 2;
    if (pinned.has(p.id)) score += 3;
    if (documentPolicyIds.has(p.id)) score += 2;
    // popularity nudge: policies with observed outcomes / evaluating evidence
    // surface above obscure records at equal relevance
    const nOutcomes = dataset.outcomes.filter((o) => o.policy_id === p.id).length;
    const nEvidence = dataset.evidence.filter(
      (e) =>
        e.policy_ids.includes(p.id) &&
        e.policy_relevance !== "CONTEXT" &&
        e.data_status !== "DEMO",
    ).length;
    score += Math.min(3, nOutcomes) * 2.0 + Math.min(5, nEvidence) * 0.75;
    // evidence-backed coverage bonus: policies with both outcomes and evidence
    // are the analyst's canonical reference set
    if (nOutcomes > 0 && nEvidence > 0) score += 1.0;
    // curated-similarity hubness: well-connected reference policies surface higher
    const nSim = dataset.similarities.filter(
      (s) => s.policy_a === p.id || s.policy_b === p.id,
    ).length;
    score += Math.min(4, nSim) * 1.5;
    if (emb) score = score * 0.6 + (emb[p.id] ?? 0) * 10 * 0.4;
    return { policy: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const max = scored[0]?.score ?? 0;
  if (max <= 0) return scored;
  return scored.map((s) => ({ policy: s.policy, score: s.score / max }));
}
