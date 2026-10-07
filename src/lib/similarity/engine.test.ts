import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { semanticScores } from "@/data/seed/semantic";
import {
  computeAllSimilarities,
  cosine,
  explainSimilarity,
} from "./engine";

const busBeg = seedDataset.similarities.find(
  (s) =>
    (s.policy_a === "pol_gb_bus" && s.policy_b === "pol_de_beg_em_2024") ||
    (s.policy_a === "pol_de_beg_em_2024" && s.policy_b === "pol_gb_bus"),
)!;

describe("computeAllSimilarities", () => {
  it("keeps curated values for curated pairs", () => {
    const all = computeAllSimilarities(seedDataset);
    const found = all.find((s) => s.id === busBeg.id);
    expect(found).toBeDefined();
    expect(found!.breakdown.overall).toBe(busBeg.breakdown.overall);
  });

  it("applies the 0.5 threshold to computed pairs only", () => {
    const all = computeAllSimilarities(seedDataset);
    const curatedIds = new Set(seedDataset.similarities.map((s) => s.id));
    for (const s of all) {
      if (!curatedIds.has(s.id)) expect(s.breakdown.overall).toBeGreaterThanOrEqual(0.5);
    }
    expect(all.length).toBeGreaterThan(seedDataset.similarities.length);
  });

  it("blends embeddings semantically when provided", () => {
    const emb = new Map(
      seedDataset.policies.map((p, i) => [
        p.id,
        Array.from({ length: 8 }, (_, j) => Math.sin(i * 3 + j)),
      ]),
    );
    const all = computeAllSimilarities(seedDataset, emb);
    expect(all.length).toBeGreaterThan(0);
  });

  it("uses generated semantic scores when no embedding map is passed", () => {
    const curatedIds = new Set(seedDataset.similarities.map((similarity) => similarity.id));
    const computed = computeAllSimilarities(seedDataset).find((similarity) => {
      const key = [similarity.policy_a, similarity.policy_b].sort().join("|");
      return !curatedIds.has(similarity.id) && semanticScores[key] !== undefined;
    });

    expect(computed).toBeDefined();
    const key = [computed!.policy_a, computed!.policy_b].sort().join("|");
    expect(computed!.breakdown.semantic).toBe(semanticScores[key]);
  });
});

describe("cosine", () => {
  it("scores identical vectors at 1", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
});

describe("explainSimilarity", () => {
  it("BUS vs BEG 2024: financing and eligibility differ", () => {
    const rows = explainSimilarity(busBeg, seedDataset);
    expect(rows.map((r) => r.label)).toEqual([
      "Mechanism",
      "Technology",
      "Target",
      "Sector",
      "Financing",
      "Eligibility",
      "Jurisdiction",
    ]);
    const fin = rows.find((r) => r.label === "Financing")!;
    expect(fin.status).toBe("different");
    expect(fin.detail).toMatch(/loan/i);
    const elig = rows.find((r) => r.label === "Eligibility")!;
    expect(elig.status).toBe("different");
    const mech = rows.find((r) => r.label === "Mechanism")!;
    expect(mech.status).toBe("same");
  });
});
