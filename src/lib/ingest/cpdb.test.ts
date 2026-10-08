import { describe, expect, it } from "vitest";

import { Policy } from "@/lib/domain/schema";
import {
  cleanText,
  cpdbYear,
  disambiguateNames,
  findCuratedDuplicate,
  isBuildingPolicy,
  mapCpdbRow,
  referenceUrls,
  type CpdbRow,
} from "./cpdb";

const row = (over: Partial<CpdbRow> = {}): CpdbRow => ({
  policy_id: 123,
  country_iso: "DEU",
  policy_title: "Heat Pump Grant",
  jurisdiction: "Country",
  policy_instrument: "Grants and subsidies, Building codes and standards, Strategic planning",
  sector: "Buildings, Heating and cooling",
  policy_description: "<p>Grants for heat pumps &amp; insulation.</p>",
  policy_status: "In force",
  decision_date: "2021",
  start_date: null,
  end_date: null,
  high_impact: "High",
  policy_objective: "Mitigation, Energy security",
  reference: "https://example.gov/hp?a=1&amp;b=2\nsee also report",
  ...over,
});

describe("CPDB mapping", () => {
  it("cleans markup and entities", () => {
    expect(cleanText("<p>A &amp; B</p>\n  C")).toBe("A & B C");
  });

  it("reads years from CPDB date formats", () => {
    expect(cpdbYear("2022.0")).toBe("2022");
    expect(cpdbYear("2019-04-01")).toBe("2019");
    expect(cpdbYear("")).toBeNull();
  });

  it("only keeps real URLs from the reference field", () => {
    expect(referenceUrls("https://a.org/x, and text\nhttp://b.org/y.")).toEqual([
      "https://a.org/x",
      "http://b.org/y",
    ]);
    expect(referenceUrls("Ministry website")).toEqual([]);
  });

  it("selects building and heating sectors only", () => {
    expect(isBuildingPolicy(row())).toBe(true);
    expect(isBuildingPolicy(row({ sector: "Transport, Light-duty vehicles" }))).toBe(false);
  });

  it("maps a national row to a valid IMPORTED policy", () => {
    const p = mapCpdbRow(row())!;
    expect(() => Policy.parse(p)).not.toThrow();
    expect(p).toMatchObject({
      id: "pol_cpdb_123",
      country_code: "DE",
      jurisdiction_id: "jur_de",
      status: "ACTIVE",
      introduced: "2021",
      sector: "ALL_BUILDINGS",
      data_status: "IMPORTED",
      description: "Grants for heat pumps & insulation.",
      objectives: ["Mitigation", "Energy security"],
    });
    expect(p.mechanism_ids).toEqual(["mech_grant", "mech_standard"]);
    expect(p.technology_ids).toEqual(["tech_heat_pump", "tech_insulation"]);
    expect(p.tags).toEqual(["cpdb", "high-impact"]);
    expect(p.sources.map((s) => s.url)).toEqual([
      "https://climatepolicydatabase.org/",
      "https://example.gov/hp?a=1&b=2",
    ]);
  });

  it("describes a record from its fields when CPDB has no description", () => {
    const p = mapCpdbRow(row({ policy_description: null }))!;
    expect(p.description).toContain("Climate Policy Database");
    expect(p.description).toContain("grants and subsidies");
  });

  it("maps EU records to the EU jurisdiction", () => {
    expect(mapCpdbRow(row({ country_iso: "EUE" }))?.jurisdiction_id).toBe("jur_eu");
  });

  it("drops rows it cannot place honestly", () => {
    expect(mapCpdbRow(row({ jurisdiction: "Subnational region" }))).toBeNull();
    expect(mapCpdbRow(row({ country_iso: "BRA" }))).toBeNull();
    expect(mapCpdbRow(row({ policy_status: "Unknown" }))).toBeNull();
    expect(mapCpdbRow(row({ decision_date: null, start_date: null }))).toBeNull();
  });

  it("sets an end year only for ended policies", () => {
    expect(mapCpdbRow(row({ policy_status: "Ended", end_date: "2015" }))?.ended).toBe("2015");
    expect(mapCpdbRow(row({ end_date: "2030" }))?.ended).toBeNull();
  });
});

describe("CPDB de-duplication", () => {
  const curated = (name: string, short_name: string | undefined, introduced: string): Policy =>
    ({ ...mapCpdbRow(row())!, id: "pol_x", name, short_name, introduced, data_status: "CURATED" });
  const imported = (name: string, introduced = "2021") =>
    ({ ...mapCpdbRow(row())!, name, introduced });

  it("matches the same policy under a longer curated name", () => {
    const c = curated("Building Energy Efficiency Act - mandatory compliance", undefined, "2021");
    expect(findCuratedDuplicate(imported("Building Energy Efficiency Act"), [c])).toBe(c);
  });

  it("matches a parenthesised acronym to the curated short name", () => {
    const c = curated("Brennstoffemissionshandelsgesetz", "BEHG", "2021");
    expect(findCuratedDuplicate(imported("Fuel Emissions Trading Act (BEHG)"), [c])).toBe(c);
  });

  it("does not match on one generic shared word", () => {
    const c = curated("Energy Company Obligation 4", "ECO4", "2021");
    expect(findCuratedDuplicate(imported("Energy Act"), [c])).toBeNull();
  });

  it("keeps successive versions years apart", () => {
    const c = curated("Energy Performance of Buildings Directive recast", undefined, "2024");
    expect(
      findCuratedDuplicate(imported("Energy Performance of Buildings Directive", "2010"), [c]),
    ).toBeNull();
  });

  it("suffixes the year on repeated titles within a country", () => {
    const names = disambiguateNames([imported("Building Code", "2009"), imported("Building Code", "2013")])
      .map((p) => p.name);
    expect(names).toEqual(["Building Code (2009)", "Building Code (2013)"]);
  });
});
