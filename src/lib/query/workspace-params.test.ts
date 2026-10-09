import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { parseWorkspaceParams } from "./workspace-params";

const params = (q: string) => new URLSearchParams(q);

describe("parseWorkspaceParams", () => {
  it("parses a valid policy id", () => {
    expect(parseWorkspaceParams(params("policy=pol_gb_bus"), seedDataset)).toEqual({
      policyId: "pol_gb_bus",
      compareIds: [],
    });
  });

  it("ignores unknown policy ids", () => {
    expect(
      parseWorkspaceParams(params("policy=pol_nope"), seedDataset).policyId,
    ).toBeNull();
  });

  it("parses a compare list, drops unknown ids and dupes", () => {
    const r = parseWorkspaceParams(
      params("compare=pol_gb_bus,pol_de_beg,pol_nope,pol_gb_bus"),
      seedDataset,
    );
    expect(r.compareIds).toEqual(["pol_gb_bus", "pol_de_beg"]);
  });

  it("caps the compare list at 4", () => {
    const ids = seedDataset.policies.slice(0, 6).map((p) => p.id).join(",");
    expect(
      parseWorkspaceParams(params(`compare=${ids}`), seedDataset).compareIds,
    ).toHaveLength(4);
  });

  it("empty params give a no-op link", () => {
    expect(parseWorkspaceParams(params(""), seedDataset)).toEqual({
      policyId: null,
      compareIds: [],
    });
  });
});
