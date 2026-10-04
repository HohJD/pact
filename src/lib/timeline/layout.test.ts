import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { firstYearOf, lastYearOf, layoutLanes } from "./layout";

describe("layoutLanes", () => {
  const lanes = layoutLanes(seedDataset.policies, seedDataset.jurisdictions);

  it("groups by country", () => {
    const codes = lanes.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("DE");
    const de = lanes.find((l) => l.code === "DE")!;
    expect(de.name).toBe("Germany");
    for (const p of de.rows) expect(p.country_code).toBe("DE");
  });

  it("orders rows by introduced", () => {
    for (const lane of lanes) {
      const years = lane.rows.map((p) => p.introduced);
      expect(years).toEqual([...years].sort());
    }
  });
});

describe("year parsing", () => {
  it("firstYearOf / lastYearOf", () => {
    expect(firstYearOf("2024-02")).toBe(2024);
    expect(firstYearOf("2015-2025")).toBe(2015);
    expect(lastYearOf("2023–2024")).toBe(2024);
    expect(lastYearOf("2023")).toBe(2023);
    expect(lastYearOf("ARRA period")).toBeNull();
  });
});
