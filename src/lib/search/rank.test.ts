import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { rankPolicies } from "./rank";

describe("rankPolicies", () => {
  it("returns scores in [0,1], sorted descending", () => {
    const scored = rankPolicies("heat pump grants", seedDataset, {
      lexicalScores: new Map([["pol_gb_bus", 5]]),
    });
    expect(scored.length).toBeGreaterThan(0);
    for (let i = 0; i < scored.length; i++) {
      expect(scored[i].score).toBeGreaterThanOrEqual(0);
      expect(scored[i].score).toBeLessThanOrEqual(1);
      if (i > 0)
        expect(scored[i].score).toBeLessThanOrEqual(scored[i - 1].score);
    }
    expect(scored[0].score).toBe(1);
  });

  it("include_imported=false drops IMPORTED policies", () => {
    const all = rankPolicies("grants", seedDataset);
    const filtered = rankPolicies("grants", seedDataset, {
      include_imported: false,
    });
    const importedIds = new Set(
      seedDataset.policies
        .filter((p) => p.data_status === "IMPORTED")
        .map((p) => p.id),
    );
    expect(filtered.some((s) => importedIds.has(s.policy.id))).toBe(false);
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });

  it("lexical hits rank above unrelated policies", () => {
    const scored = rankPolicies("boiler upgrade", seedDataset, {
      lexicalScores: new Map([["pol_gb_bus", 10]]),
    });
    expect(scored[0].policy.id).toBe("pol_gb_bus");
  });
});
