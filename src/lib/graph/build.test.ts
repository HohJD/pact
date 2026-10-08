import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { buildGraph } from "./build";
import { layoutGraph } from "./layout";

describe("buildGraph", () => {
  it("includes all policies unfiltered", () => {
    const g = buildGraph(seedDataset);
    expect(g.policyCount).toBe(
      seedDataset.policies.filter((p) => p.data_status !== "IMPORTED").length,
    );
    // every policy, its jurisdiction, and ≥1 tech/mech nodes present
    expect(g.nodes.filter((n) => n.kind === "jurisdiction").length).toBeGreaterThan(5);
    expect(g.nodes.find((n) => n.id === "tech_heat_pump")).toBeDefined();
    expect(g.edges.length).toBeGreaterThan(g.nodes.length);
  });

  it("filters to heat-pump technology", () => {
    const g = buildGraph(seedDataset, { technology_ids: ["tech_heat_pump"] });
    expect(g.policyCount).toBeLessThan(seedDataset.policies.length);
    expect(g.policyCount).toBeGreaterThan(30);
    const policyNodes = g.nodes.filter((n) => n.kind === "policy");
    expect(policyNodes.length).toBe(g.policyCount);
    // SG MEPS (efficient appliances only) must be gone
    expect(g.nodes.find((n) => n.id === "pol_sg_meps_ac")).toBeUndefined();
    // tech node still present
    expect(g.nodes.find((n) => n.id === "tech_heat_pump")).toBeDefined();
    // edges only reference visible nodes
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const e of g.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it("combines country + mechanism filters", () => {
    const g = buildGraph(seedDataset, {
      countries: ["DE"],
      mechanism_ids: ["mech_grant"],
    });
    const policyNodes = g.nodes.filter((n) => n.kind === "policy");
    expect(policyNodes.length).toBeGreaterThan(2);
    expect(policyNodes.length).toBeLessThan(10);
    expect(policyNodes.map((n) => n.id)).toContain("pol_de_beg");
  });

  it("shows evidence and outcome nodes only for expanded policies", () => {
    const collapsed = buildGraph(seedDataset, { countries: ["US"] });
    expect(collapsed.nodes.filter((n) => n.kind === "evidence")).toHaveLength(0);

    const expanded = buildGraph(seedDataset, { countries: ["US"] }, new Set(["pol_us_wap"]));
    const evNodes = expanded.nodes.filter((n) => n.kind === "evidence");
    expect(evNodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(["ev_fowlie_wap_2018", "ev_ornl_wap_2015", "ev_christensen_wap_2021"]),
    );
    const outNodes = expanded.nodes.filter((n) => n.kind === "outcome");
    expect(outNodes.map((n) => n.id)).toContain("out_us_wap_realised_savings");
    const types = new Set(
      expanded.edges.filter((e) => e.target.startsWith("ev_")).map((e) => e.type),
    );
    expect(types.has("EVALUATED_BY")).toBe(true);
  });

  it("drops SIMILAR_TO edges below 0.65 weight", () => {
    const g = buildGraph(seedDataset);
    const simEdges = g.edges.filter((e) => e.type === "SIMILAR_TO");
    expect(simEdges.length).toBeGreaterThan(0);
    expect(simEdges.every((e) => (e.weight ?? 0) >= 0.65)).toBe(true);
    // 0.60 (behg↔el_afgift), 0.62, 0.65 are at the boundary; <0.65 must be absent
    expect(
      simEdges.find(
        (e) => e.source === "pol_de_behg" && e.target === "pol_dk_el_afgift",
      ),
    ).toBeUndefined();
  });
});

describe("layoutGraph", () => {
  it("produces deterministic finite positions", () => {
    const g = buildGraph(seedDataset, { countries: ["GB"] });
    const a = layoutGraph(g.nodes, g.edges);
    const b = layoutGraph(g.nodes, g.edges);
    for (const n of a) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      const other = b.find((m) => m.id === n.id)!;
      expect(n.x).toBeCloseTo(other.x, 6);
      expect(n.y).toBeCloseTo(other.y, 6);
    }
  });

  it("is stable when seeded with previous positions", () => {
    const g = buildGraph(seedDataset, { countries: ["GB"] });
    const first = layoutGraph(g.nodes, g.edges);
    const prev = new Map(first.map((n) => [n.id, { x: n.x, y: n.y }]));
    const second = layoutGraph(g.nodes, g.edges, prev);
    // re-layout from a converged state should stay in the same neighbourhood.
    // policy collide radius is now the rect half-diagonal (~110px), so a node
    // squeezed out of a cluster can legitimately drift a few hundred px.
    for (const n of second) {
      const before = first.find((m) => m.id === n.id)!;
      expect(Math.abs(n.x - before.x)).toBeLessThan(300);
      expect(Math.abs(n.y - before.y)).toBeLessThan(300);
    }
  });
});
