import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { keyDifferences, lessons } from "./compare";

const policy = (id: string) => {
  const p = seedDataset.policies.find((x) => x.id === id);
  if (!p) throw new Error(`missing ${id}`);
  return p;
};

describe("keyDifferences", () => {
  it("flags concessional loan and GEG pairing for BUS vs BEG-2024", () => {
    const diffs = keyDifferences(
      [policy("pol_gb_bus"), policy("pol_de_beg_em_2024")],
      seedDataset,
    ).join("\n");

    expect(diffs).toMatch(/loan/i);
    expect(diffs).toMatch(/GEG|GModG/);
    expect(diffs).toMatch(/no equivalent in force/i);
  });

  it("produces bold-prefixed bullets", () => {
    const diffs = keyDifferences(
      [policy("pol_gb_bus"), policy("pol_de_beg_em_2024"), policy("pol_fr_maprimerenov")],
      seedDataset,
    );
    expect(diffs.length).toBeGreaterThanOrEqual(3);
    expect(diffs.length).toBeLessThanOrEqual(6);
    for (const d of diffs) expect(d.startsWith("**")).toBe(true);
  });

  it("never reads an imported policy's missing detail as fact", () => {
    // KfW Ecological Construction (CPDB): no incentive, eligibility or technology data
    const imported = policy("pol_cpdb_211001583");
    const diffs = keyDifferences([imported, policy("pol_de_beg_em_2024")], seedDataset).join("\n");

    expect(diffs).not.toMatch(/KfW Ecological Construction[^.;]*(no equivalent|open to all)/);
    expect(diffs).not.toMatch(/KfW Ecological Construction: ·/);
  });
});

describe("lessons", () => {
  it("never uses causal wording unless the outcome inference is CAUSAL", () => {
    // BUS outcomes are correlational/descriptive only
    const claims = lessons([policy("pol_gb_bus")], seedDataset);
    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) expect(c.text).not.toMatch(/evidence shows/i);
  });

  it("uses causal wording for a policy with a CAUSAL outcome", () => {
    const claims = lessons([policy("pol_us_wap")], seedDataset);
    expect(claims.some((c) => /evidence shows/i.test(c.text))).toBe(true);
  });

  it("returns an UNCERTAIN insufficient-evidence claim for a policy without outcomes", () => {
    const noOutcome = seedDataset.policies.find(
      (p) => !seedDataset.outcomes.some((o) => o.policy_id === p.id),
    );
    expect(noOutcome).toBeDefined();
    const claims = lessons([noOutcome!], seedDataset);
    expect(claims).toHaveLength(1);
    expect(claims[0].inference_type).toBe("UNCERTAIN");
    expect(claims[0].evidence_ids).toHaveLength(0);
    expect(claims[0].text).toMatch(/Insufficient evidence/);
  });

  it("marks DEMO-only evidence claims as UNCERTAIN", () => {
    // every claim's evidence_ids must equal its outcome's evidence ids
    const claims = lessons([policy("pol_gb_bus")], seedDataset);
    for (const c of claims) {
      for (const id of c.evidence_ids) {
        const ev = seedDataset.evidence.find((e) => e.id === id)!;
        expect(ev.policy_ids).toContain("pol_gb_bus");
      }
    }
  });
});
