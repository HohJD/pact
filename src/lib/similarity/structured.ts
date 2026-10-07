import { z } from "zod";

import {
  SimilarityBreakdown,
  type Dataset,
  type Jurisdiction,
  type Policy,
  type Similarity,
} from "@/lib/domain/schema";
import { semanticScores } from "@/data/seed/semantic";

type SimilarityBreakdownT = z.infer<typeof SimilarityBreakdown>;

const EUROPEAN = new Set(["GB", "DE", "FR", "NL", "DK", "NO"]);

const WEIGHTS = {
  technology: 0.25,
  mechanism: 0.25,
  sector: 0.1,
  target: 0.1,
  jurisdiction: 0.1,
  semantic: 0.2,
} as const;

const JURISDICTION_SCORE = { HIGH: 1, MEDIUM: 0.5, LOW: 0 } as const;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/^(tech|mech|pol|jur)_/, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function policyTokens(p: Policy): Set<string> {
  const words = [
    ...p.tags,
    ...p.technology_ids,
    ...p.mechanism_ids,
    p.short_name ?? "",
    p.name,
  ];
  return new Set(words.flatMap(tokenize));
}

export function jurisdictionSimilarity(
  a: Policy,
  b: Policy,
  jurisdictions: Jurisdiction[],
): "LOW" | "MEDIUM" | "HIGH" {
  if (a.country_code === b.country_code) return "HIGH";
  const jurA = jurisdictions.find((j) => j.id === a.jurisdiction_id);
  const jurB = jurisdictions.find((j) => j.id === b.jurisdiction_id);
  const aEuro = EUROPEAN.has(a.country_code) || jurA?.level === "SUPRANATIONAL";
  const bEuro = EUROPEAN.has(b.country_code) || jurB?.level === "SUPRANATIONAL";
  if (aEuro && bEuro) return "MEDIUM";
  if (a.country_code === "US" && b.country_code === "US") return "MEDIUM";
  return "LOW";
}

export function structuredSimilarity(
  a: Policy,
  b: Policy,
  jurisdictions: Jurisdiction[],
  semanticOverride?: number,
): SimilarityBreakdownT {
  const same_technology = a.technology_ids.some((t) => b.technology_ids.includes(t));
  const same_mechanism = a.mechanism_ids.some((m) => b.mechanism_ids.includes(m));
  const same_sector = a.sector === b.sector;
  const targetsA = new Set(a.target_groups.map((t) => t.toLowerCase()));
  const same_target = b.target_groups.some((t) => targetsA.has(t.toLowerCase()));
  const jurisdiction_similarity = jurisdictionSimilarity(a, b, jurisdictions);
  const semantic = semanticOverride ?? jaccard(policyTokens(a), policyTokens(b));

  const overall =
    (same_technology ? WEIGHTS.technology : 0) +
    (same_mechanism ? WEIGHTS.mechanism : 0) +
    (same_sector ? WEIGHTS.sector : 0) +
    (same_target ? WEIGHTS.target : 0) +
    JURISDICTION_SCORE[jurisdiction_similarity] * WEIGHTS.jurisdiction +
    semantic * WEIGHTS.semantic;

  const differences: string[] = [];
  if (!same_mechanism) differences.push("Different primary mechanisms.");
  if (!same_technology) differences.push("Different technology focus.");
  if (!same_sector) differences.push("Different building sectors.");
  if (jurisdiction_similarity === "LOW") differences.push("Different regions and market contexts.");
  if (same_sector && same_mechanism && same_technology && differences.length === 0)
    differences.push("Closely aligned policy design; differences are mainly contextual.");

  return {
    semantic: Math.min(1, Math.max(0, semantic)),
    same_sector,
    same_mechanism,
    same_target,
    same_technology,
    jurisdiction_similarity,
    overall: Math.min(1, Math.max(0, overall)),
    differences,
  };
}

function similarityId(a: string, b: string): string {
  return `sim_${[a, b].sort().join("_")}`;
}

function semanticPairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/**
 * Top-N similar policies: curated seed similarities first (preferred), then
 * computed structured pairs to fill the remainder.
 */
export function topSimilar(policyId: string, dataset: Dataset, n = 5): Similarity[] {
  const me = dataset.policies.find((p) => p.id === policyId);
  if (!me) return [];

  const curated = dataset.similarities
    .filter((s) => s.policy_a === policyId || s.policy_b === policyId)
    .sort((x, y) => y.breakdown.overall - x.breakdown.overall)
    .slice(0, n);

  const seen = new Set(
    curated.map((s) => (s.policy_a === policyId ? s.policy_b : s.policy_a)),
  );

  const computed: Similarity[] = dataset.policies
    .filter((p) => p.id !== policyId && !seen.has(p.id))
    .map((p) => ({
      id: similarityId(policyId, p.id),
      policy_a: policyId,
      policy_b: p.id,
      breakdown: structuredSimilarity(
        me,
        p,
        dataset.jurisdictions,
        semanticScores[semanticPairKey(me.id, p.id)],
      ),
    }))
    .sort((x, y) => y.breakdown.overall - x.breakdown.overall);

  return [...curated, ...computed].slice(0, n);
}
