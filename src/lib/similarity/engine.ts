import { z } from "zod";

import {
  MechanismKind,
  type Dataset,
  type Policy,
  type Similarity,
} from "@/lib/domain/schema";
import { structuredSimilarity } from "./structured";

const FINANCING_KINDS = new Set<z.infer<typeof MechanismKind>>([
  "GRANT",
  "LOAN",
  "TAX_CREDIT",
  "OBLIGATION",
]);

const INCOME_RE = /\b(income|low-income|means[- ]tested|deprived|fuel poor)\b/i;

function similarityId(a: string, b: string): string {
  return `sim_${[a, b].sort().join("_")}`;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * All-pairs similarity over the dataset. Curated seed similarities always win
 * over computed values for the same pair; computed pairs below 0.5 are dropped
 * (unless curated, which are kept verbatim).
 */
export function computeAllSimilarities(
  dataset: Dataset,
  embeddings?: Map<string, number[]>,
): Similarity[] {
  const curated = new Map(dataset.similarities.map((s) => [pairKey(s.policy_a, s.policy_b), s]));
  const computed: Similarity[] = [];
  const policies = dataset.policies;

  for (let i = 0; i < policies.length; i++) {
    for (let j = i + 1; j < policies.length; j++) {
      const a = policies[i];
      const b = policies[j];
      const key = pairKey(a.id, b.id);
      if (curated.has(key)) continue;
      const ea = embeddings?.get(a.id);
      const eb = embeddings?.get(b.id);
      const semantic = ea && eb ? Math.max(0, Math.min(1, (cosine(ea, eb) + 1) / 2)) : undefined;
      const breakdown = structuredSimilarity(a, b, dataset.jurisdictions, semantic);
      if (breakdown.overall < 0.5) continue;
      computed.push({ id: similarityId(a.id, b.id), policy_a: a.id, policy_b: b.id, breakdown });
    }
  }
  return [...dataset.similarities, ...computed];
}

export interface ExplainRow {
  label:
    | "Mechanism"
    | "Technology"
    | "Target"
    | "Sector"
    | "Financing"
    | "Eligibility"
    | "Jurisdiction";
  status: "same" | "different" | "partial";
  detail: string;
}

const SECTOR_LABEL: Record<string, string> = {
  RESIDENTIAL_BUILDINGS: "Residential buildings",
  COMMERCIAL_BUILDINGS: "Commercial buildings",
  PUBLIC_BUILDINGS: "Public buildings",
  ALL_BUILDINGS: "All buildings",
};

function techNames(p: Policy, dataset: Dataset): string[] {
  return p.technology_ids.map(
    (id) => dataset.technologies.find((t) => t.id === id)?.name ?? id,
  );
}

function mechNames(p: Policy, dataset: Dataset): string[] {
  return p.mechanism_ids.map(
    (id) => dataset.mechanisms.find((m) => m.id === id)?.name ?? id,
  );
}

function financingKinds(p: Policy, dataset: Dataset): string[] {
  return p.mechanism_ids
    .map((id) => dataset.mechanisms.find((m) => m.id === id))
    .filter((m) => m && FINANCING_KINDS.has(m.kind))
    .map((m) => m!.name);
}

function incomeTargeted(p: Policy): boolean {
  return INCOME_RE.test(
    `${p.eligibility} ${p.incentive} ${p.target_groups.join(" ")}`,
  );
}

function setCompare(aIds: string[], bIds: string[]): "same" | "partial" | "different" {
  const a = new Set(aIds);
  const b = new Set(bIds);
  const overlap = aIds.filter((x) => b.has(x)).length;
  if (overlap === 0) return "different";
  if (a.size === b.size && overlap === a.size) return "same";
  return "partial";
}

/**
 * Human-readable explanation of a similarity record — the 7 rows shown in the
 * SIMILARITY panel. `detail` carries the actual values on each side.
 */
export function explainSimilarity(sim: Similarity, dataset: Dataset): ExplainRow[] {
  const a = dataset.policies.find((p) => p.id === sim.policy_a);
  const b = dataset.policies.find((p) => p.id === sim.policy_b);
  const bd = sim.breakdown;
  if (!a || !b) return [];

  const jurName = (p: Policy) =>
    dataset.jurisdictions.find((j) => j.id === p.jurisdiction_id)?.name ??
    p.country_code;

  const finA = financingKinds(a, dataset);
  const finB = financingKinds(b, dataset);
  const sameFin = new Set(finA).size === new Set(finB).size && finA.every((f) => finB.includes(f));

  const incA = incomeTargeted(a);
  const incB = incomeTargeted(b);

  return [
    {
      label: "Mechanism",
      status:
        setCompare(a.mechanism_ids, b.mechanism_ids) === "different"
          ? "different"
          : "same",
      detail: `${mechNames(a, dataset).join(" + ")} vs ${mechNames(b, dataset).join(" + ")}`,
    },
    {
      label: "Technology",
      status: setCompare(a.technology_ids, b.technology_ids),
      detail: `${techNames(a, dataset).join(" + ")} vs ${techNames(b, dataset).join(" + ")}`,
    },
    {
      label: "Target",
      status: bd.same_target ? "same" : "different",
      detail: `${a.target_groups.slice(0, 3).join(", ") || "—"} vs ${b.target_groups.slice(0, 3).join(", ") || "—"}`,
    },
    {
      label: "Sector",
      status: bd.same_sector ? "same" : "different",
      detail: `${SECTOR_LABEL[a.sector] ?? a.sector} vs ${SECTOR_LABEL[b.sector] ?? b.sector}`,
    },
    {
      label: "Financing",
      status: sameFin ? "same" : "different",
      detail:
        finA.length === 0 && finB.length === 0
          ? "no financing mechanism on either side"
          : `${finA.join(" + ") || "none"} vs ${finB.join(" + ") || "none"}`,
    },
    {
      label: "Eligibility",
      status: incA === incB ? "same" : "different",
      detail:
        incA === incB
          ? incA
            ? "both income-targeted"
            : "both universal"
          : `${incA ? "income-targeted" : "universal"} vs ${incB ? "income-targeted" : "universal"}`,
    },
    {
      label: "Jurisdiction",
      status:
        bd.jurisdiction_similarity === "HIGH"
          ? "same"
          : bd.jurisdiction_similarity === "MEDIUM"
            ? "partial"
            : "different",
      detail: `${jurName(a)} vs ${jurName(b)}`,
    },
  ];
}
