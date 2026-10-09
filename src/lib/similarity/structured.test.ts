import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { semanticScores } from "@/data/seed/semantic";
import {
  DEFAULT_SIMILARITY_WEIGHTS,
  jurisdictionSimilarity,
  rescoreSimilarity,
  structuredSimilarity,
  topSimilar,
} from "./structured";

const byId = (id: string) => {
  const p = seedDataset.policies.find((x) => x.id === id);
  if (!p) throw new Error(`missing policy ${id}`);
  return p;
};

describe("structuredSimilarity", () => {
  it("scores an identical design highly", () => {
    const bus = byId("pol_gb_bus");
    const breakdown = structuredSimilarity(bus, bus, seedDataset.jurisdictions);
    expect(breakdown.same_technology).toBe(true);
    expect(breakdown.same_mechanism).toBe(true);
    expect(breakdown.same_sector).toBe(true);
    expect(breakdown.jurisdiction_similarity).toBe("HIGH");
    expect(breakdown.overall).toBeGreaterThan(0.8);
  });

  it("scores dissimilar policies lower", () => {
    const bus = byId("pol_gb_bus");
    const sgAudit = byId("pol_sg_mandatory_audit");
    const breakdown = structuredSimilarity(bus, sgAudit, seedDataset.jurisdictions);
    expect(breakdown.overall).toBeLessThan(0.5);
    expect(breakdown.jurisdiction_similarity).toBe("LOW");
  });

  it("rates european cross-country jurisdiction as MEDIUM", () => {
    const bus = byId("pol_gb_bus");
    const isde = byId("pol_nl_isde");
    expect(jurisdictionSimilarity(bus, isde, seedDataset.jurisdictions)).toBe("MEDIUM");
  });

  it("rates EU supranational vs member state as MEDIUM", () => {
    const epbd = byId("pol_eu_epbd_2024");
    const beg = byId("pol_de_beg");
    expect(jurisdictionSimilarity(epbd, beg, seedDataset.jurisdictions)).toBe("MEDIUM");
  });

  it("rates transatlantic jurisdiction as LOW", () => {
    const bus = byId("pol_gb_bus");
    const wap = byId("pol_us_wap");
    expect(jurisdictionSimilarity(bus, wap, seedDataset.jurisdictions)).toBe("LOW");
  });

  it("respects weight ordering: shared tech+mech beats shared sector only", () => {
    const bus = byId("pol_gb_bus");
    const isde = byId("pol_nl_isde"); // shares heat pump + grant
    const fhs = byId("pol_gb_fhs"); // same country, same sector
    const simIsde = structuredSimilarity(bus, isde, seedDataset.jurisdictions);
    const simFhs = structuredSimilarity(bus, fhs, seedDataset.jurisdictions);
    expect(simIsde.overall).toBeGreaterThan(simFhs.overall);
  });
});

describe("topSimilar", () => {
  it("prefers curated pairs and respects n", () => {
    const results = topSimilar("pol_gb_bus", seedDataset, 5);
    expect(results.length).toBe(5);
    // The highest-scoring curated pair for BUS is BEG 2024 (0.82).
    const curated = results.find(
      (s) => s.policy_b === "pol_de_beg_em_2024" || s.policy_a === "pol_de_beg_em_2024",
    );
    expect(curated).toBeDefined();
    expect(results[0].breakdown.overall).toBeGreaterThanOrEqual(
      results[results.length - 1].breakdown.overall,
    );
  });

  it("returns empty for unknown policy", () => {
    expect(topSimilar("pol_nowhere", seedDataset, 3)).toEqual([]);
  });

  it("uses generated semantic scores for computed pairs", () => {
    const curatedPairs = new Set(
      seedDataset.similarities.map((similarity) =>
        [similarity.policy_a, similarity.policy_b].sort().join("|"),
      ),
    );
    const computed = topSimilar("pol_jp_top_runner", seedDataset, 10).find((similarity) => {
      const key = [similarity.policy_a, similarity.policy_b].sort().join("|");
      return !curatedPairs.has(key) && semanticScores[key] !== undefined;
    });

    expect(computed).toBeDefined();
    const key = [computed!.policy_a, computed!.policy_b].sort().join("|");
    expect(computed!.breakdown.semantic).toBe(semanticScores[key]);
  });
});

describe("rescoreSimilarity", () => {
  it("default weights reproduce a computed breakdown's overall score", () => {
    const b = structuredSimilarity(
      byId("pol_gb_bus"),
      byId("pol_de_beg"),
      seedDataset.jurisdictions,
      semanticScores["pol_de_beg|pol_gb_bus"],
    );
    expect(rescoreSimilarity(b, DEFAULT_SIMILARITY_WEIGHTS)).toBeCloseTo(
      b.overall,
      2,
    );
  });

  it("zero semantic weight ignores the semantic dimension", () => {
    const s = seedDataset.similarities[0];
    const a = rescoreSimilarity(s.breakdown, {
      ...DEFAULT_SIMILARITY_WEIGHTS,
      semantic: 0,
    });
    const b = rescoreSimilarity(
      { ...s.breakdown, semantic: s.breakdown.semantic === 1 ? 0 : 1 },
      { ...DEFAULT_SIMILARITY_WEIGHTS, semantic: 0 },
    );
    expect(a).toBe(b);
  });

  it("all-zero weights score 0", () => {
    const s = seedDataset.similarities[0];
    expect(
      rescoreSimilarity(s.breakdown, {
        technology: 0,
        mechanism: 0,
        sector: 0,
        target: 0,
        jurisdiction: 0,
        semantic: 0,
      }),
    ).toBe(0);
  });
});
