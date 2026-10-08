import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import type { Policy } from "@/lib/domain/schema";
import { searchCatalogue } from "./catalogue";

describe("searchCatalogue", () => {
  it("finds an insulation policy near the top for a fuzzy typo", () => {
    const results = searchCatalogue(seedDataset, "insulaton");
    expect(results.policies.slice(0, 3).some((policy) => policy.tags.includes("insulation"))).toBe(
      true,
    );
  });

  it("supports prefix search", () => {
    expect(searchCatalogue(seedDataset, "decarb").policies.length).toBeGreaterThan(0);
  });

  it("returns Japanese policies for a country name", () => {
    const policies = searchCatalogue(seedDataset, "Japan").policies;
    expect(policies.length).toBeGreaterThan(0);
    expect(policies[0].country_code).toBe("JP");
    // Japanese policies rank first; others only match on text that mentions Japan
    const firstOther = policies.findIndex((policy) => policy.country_code !== "JP");
    if (firstOther !== -1)
      expect(policies.slice(firstOther).every((policy) => policy.country_code !== "JP")).toBe(true);
  });

  it("indexes policy funding and eligibility text", () => {
    expect(
      searchCatalogue(seedDataset, "manifesto").policies.map((policy) => policy.id),
    ).toContain("pol_gb_shdf");
  });

  it("ranks a name match above a description-only match", () => {
    const base = seedDataset.policies[0];
    const clean = (id: string, name: string, description: string): Policy => ({
      ...base,
      id,
      name,
      short_name: "",
      tags: [],
      description,
      incentive: "",
      eligibility: "",
      funding: "",
      objectives: [],
      implementation_notes: "",
      limitations: [],
      target_groups: [],
    });
    const dataset = {
      ...seedDataset,
      policies: [
        clean("pol_name_match", "Cobalt Retrofit", ""),
        clean("pol_description_match", "Other Retrofit", "A description mentioning cobalt."),
      ],
    };

    expect(searchCatalogue(dataset, "cobalt").policies[0].id).toBe("pol_name_match");
  });

  it("returns empty collections and scores for an empty query", () => {
    expect(searchCatalogue(seedDataset, "   ")).toEqual({
      policies: [],
      evidence: [],
      jurisdictions: [],
      technologies: [],
      mechanisms: [],
      scores: new Map(),
    });
  });
});
