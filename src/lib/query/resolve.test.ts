import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { resolveQuery } from "./resolve";

describe("resolveQuery", () => {
  it("resolves the flagship heat-pump question to EXPLORE + technology filter", () => {
    const r = resolveQuery(
      "Which policies have successfully accelerated heat-pump adoption?",
      seedDataset,
    );
    expect(r.intent).toBe("EXPLORE");
    expect(r.filters.technology_ids).toEqual(["tech_heat_pump"]);
  });

  it("detects COMPARE intent", () => {
    const r = resolveQuery("Compare grant schemes in Germany and France", seedDataset);
    expect(r.intent).toBe("COMPARE");
    expect(r.filters.mechanism_ids).toContain("mech_grant");
    expect(r.filters.countries).toEqual(expect.arrayContaining(["DE", "FR"]));
  });

  it("detects OUTCOMES intent", () => {
    const r = resolveQuery("What happened after the UK boiler grant?", seedDataset);
    expect(r.intent).toBe("OUTCOMES");
    expect(r.filters.countries).toContain("GB");
  });

  it("detects EVIDENCE intent", () => {
    const r = resolveQuery("What evidence is there for insulation programmes?", seedDataset);
    expect(r.intent).toBe("EVIDENCE");
    expect(r.filters.technology_ids).toContain("tech_insulation");
  });

  it("detects TRANSFER intent", () => {
    const r = resolveQuery("What could Oxford learn from Dutch insulation policy?", seedDataset);
    expect(r.intent).toBe("TRANSFER");
    expect(r.filters.countries).toContain("NL");
  });

  it("resolves bans in Norway", () => {
    const r = resolveQuery("Show me heating bans in Norway", seedDataset);
    expect(r.intent).toBe("EXPLORE");
    expect(r.filters.mechanism_ids).toContain("mech_ban");
    expect(r.filters.countries).toContain("NO");
  });

  it("resolves Japan queries to JP", () => {
    const r = resolveQuery("What has Japan done?", seedDataset);
    expect(r.filters.countries).toContain("JP");
  });

  it("resolves Asian building queries to every Asian country in the catalogue", () => {
    const r = resolveQuery("asian building codes", seedDataset);
    expect(r.filters.countries).toEqual(
      expect.arrayContaining(["JP", "KR", "CN", "IN", "SG"]),
    );
  });

  it("does not resolve Indiana to India", () => {
    const r = resolveQuery("Show me building codes in Indiana", seedDataset);
    expect(r.filters.countries ?? []).not.toContain("IN");
  });
});
