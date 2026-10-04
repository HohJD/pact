import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { SeedRepository } from "./seed-repository";

const repo = new SeedRepository(seedDataset);

describe("SeedRepository", () => {
  it("getPolicy returns the record", () => {
    expect(repo.getPolicy("pol_gb_bus")?.name).toBe("Boiler Upgrade Scheme");
    expect(repo.getPolicy("nope")).toBeUndefined();
  });

  it("filters by country", () => {
    const fr = repo.listPolicies({ countries: ["FR"] });
    expect(fr.length).toBeGreaterThan(5);
    expect(fr.every((p) => p.country_code === "FR")).toBe(true);
  });

  it("filters by technology and mechanism", () => {
    const grants = repo.listPolicies({
      technology_ids: ["tech_heat_pump"],
      mechanism_ids: ["mech_grant"],
    });
    expect(grants.length).toBeGreaterThan(10);
    expect(
      grants.every(
        (p) => p.technology_ids.includes("tech_heat_pump") && p.mechanism_ids.includes("mech_grant"),
      ),
    ).toBe(true);
  });

  it("filters by year range", () => {
    const recent = repo.listPolicies({ year_from: 2023 });
    expect(recent.every((p) => parseInt(p.introduced.slice(0, 4), 10) >= 2023)).toBe(true);
  });

  it("filters by status", () => {
    const superseded = repo.listPolicies({ status: "SUPERSEDED" });
    expect(superseded.map((p) => p.id)).toContain("pol_fr_cite");
  });

  it("filters by min_evidence_strength (only WAP has experimental evidence)", () => {
    const strong = repo.listPolicies({ min_evidence_strength: ["EXPERIMENTAL"] });
    expect(strong.map((p) => p.id)).toEqual(["pol_us_wap"]);
  });

  it("filters by query", () => {
    const hits = repo.listPolicies({ query: "scrappage" });
    expect(hits.map((p) => p.id)).toContain("pol_no_enova_scrappage");
  });

  it("getEvidenceForPolicy returns linked evidence", () => {
    const evs = repo.getEvidenceForPolicy("pol_us_wap");
    expect(evs.map((e) => e.id)).toEqual(
      expect.arrayContaining(["ev_fowlie_wap_2018", "ev_ornl_wap_2015", "ev_christensen_wap_2021"]),
    );
  });

  it("getOutcomesForPolicy returns linked outcomes", () => {
    const outs = repo.getOutcomesForPolicy("pol_gb_bus");
    expect(outs.length).toBe(2);
  });

  it("getTimeSeries filters by country and metric", () => {
    const de = repo.getTimeSeries("DE");
    expect(de.length).toBe(2);
    const hp = repo.getTimeSeries("DE", "metric_hp_sales");
    expect(hp).toHaveLength(1);
    expect(hp[0].points.find((p) => p.year === 2023)?.value).toBe(356000);
  });

  it("getSimilar returns curated pair first for BUS", () => {
    const sims = repo.getSimilar("pol_gb_bus", 3);
    expect(sims).toHaveLength(3);
    const other = sims[0].policy_a === "pol_gb_bus" ? sims[0].policy_b : sims[0].policy_a;
    expect(other).toBe("pol_de_beg_em_2024");
    expect(sims[0].breakdown.overall).toBeCloseTo(0.82);
  });

  it("searchText ranks relevant policies first", () => {
    const res = repo.searchText("heat pump grant");
    expect(res.policies.length).toBeGreaterThan(0);
    expect(res.policies[0].technology_ids).toContain("tech_heat_pump");
    expect(res.evidence.length).toBeGreaterThan(0);
  });

  it("searchText matches jurisdiction names", () => {
    const res = repo.searchText("singapore");
    expect(res.jurisdictions[0]?.id).toBe("jur_sg");
  });

  describe("getEvidenceStrength", () => {
    it("scores WAP as Strong (experimental)", () => {
      const s = repo.getEvidenceStrength("pol_us_wap");
      expect(s.score).toBe(5);
      expect(s.label).toBe("Strong");
      expect(s.summary.join(" ")).toMatch(/experimental/i);
    });

    it("scores BUS Strong (meta-analysis present)", () => {
      const s = repo.getEvidenceStrength("pol_gb_bus");
      expect(s.score).toBe(5);
      expect(s.label).toBe("Strong");
    });

    it("scores a single-descriptive-evidence policy as Limited with score 1", () => {
      // pol_nl_paw only has ev_rekenkamer_paw (DESCRIPTIVE)
      const s = repo.getEvidenceStrength("pol_nl_paw");
      expect(s.score).toBe(1);
      expect(s.label).toBe("Limited");
    });

    it("scores a policy with no evidence as Insufficient", () => {
      const s = repo.getEvidenceStrength("pol_gb_warm_homes_plan");
      expect(s.score).toBe(0);
      expect(s.label).toBe("Insufficient");
    });
  });
});
