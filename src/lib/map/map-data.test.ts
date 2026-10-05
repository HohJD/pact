import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { computeMapData } from "./map-data";

describe("computeMapData", () => {
  it("counts DE policies under the DE roll-up", () => {
    const d = computeMapData(seedDataset, {});
    const de = d.countries.get("DE");
    expect(de).toBeDefined();
    const expected = seedDataset.policies.filter((p) => p.country_code === "DE");
    expect(de!.count).toBe(expected.length);
    expect(de!.policies).toHaveLength(expected.length);
  });

  it("includes Japan in unfiltered country data", () => {
    const d = computeMapData(seedDataset, {});
    const jp = d.countries.get("JP");
    expect(jp).toBeDefined();
    expect(jp!.count).toBeGreaterThanOrEqual(4);
  });

  it("rolls sub-national US jurisdictions up under US in country data", () => {
    const d = computeMapData(seedDataset, {});
    const us = d.countries.get("US")!;
    const usPolicies = seedDataset.policies.filter((p) => p.country_code === "US");
    expect(us.count).toBe(usPolicies.length);
    // sub-national jurisdictions appear as markers, not countries
    const subIds = seedDataset.jurisdictions
      .filter((j) => j.level !== "NATIONAL" && j.level !== "SUPRANATIONAL")
      .map((j) => j.id);
    const markerJurs = new Set(d.markers.map((m) => m.jurisdictionId));
    for (const p of usPolicies)
      if (subIds.includes(p.jurisdiction_id)) expect(markerJurs.has(p.jurisdiction_id)).toBe(true);
  });

  it("respects technology filters", () => {
    const d = computeMapData(seedDataset, { technology_ids: ["tech_heat_pump"] });
    const expected = seedDataset.policies.filter((p) =>
      p.technology_ids.includes("tech_heat_pump"),
    );
    expect(d.totalPolicies).toBe(expected.length);
    expect([...d.countries.values()].reduce((a, c) => a + c.count, 0)).toBe(
      expected.length,
    );
  });

  it("intensity is normalised to the max country", () => {
    const d = computeMapData(seedDataset, {});
    const max = Math.max(...[...d.countries.values()].map((c) => c.count));
    const top = [...d.countries.values()].find((c) => c.count === max)!;
    expect(top.intensity).toBe(1);
  });

  it("emits an EU marker at Brussels and a Singapore marker", () => {
    const d = computeMapData(seedDataset, {});
    const eu = d.markers.find((m) => m.kind === "EU");
    expect(eu).toBeDefined();
    expect(eu!.lat).toBeCloseTo(50.85);
    expect(eu!.lng).toBeCloseTo(4.35);
    expect(d.markers.some((m) => m.id === "jur_sg")).toBe(true);
  });
});
