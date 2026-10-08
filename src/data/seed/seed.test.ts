import { describe, expect, it } from "vitest";

import { Dataset } from "@/lib/domain/schema";
import { seedDataset } from "./index";

const dataset = Dataset.parse(seedDataset); // fails loudly on schema violation

const ids = <T extends { id: string }>(xs: T[]) => new Set(xs.map((x) => x.id));

const policyIds = ids(dataset.policies);
const jurisdictionIds = ids(dataset.jurisdictions);
const technologyIds = ids(dataset.technologies);
const mechanismIds = ids(dataset.mechanisms);
const evidenceIds = ids(dataset.evidence);
const metricIds = ids(dataset.metrics);

const evidenceById = new Map(dataset.evidence.map((e) => [e.id, e]));

describe("seed dataset", () => {
  it("parses against the schema", () => {
    expect(dataset.policies.length).toBeGreaterThan(0);
  });

  it("has at least 55 policies", () => {
    expect(dataset.policies.length).toBeGreaterThanOrEqual(55);
  });

  it("all policy foreign keys resolve", () => {
    for (const p of dataset.policies) {
      expect(jurisdictionIds.has(p.jurisdiction_id), `${p.id} jurisdiction`).toBe(true);
      for (const t of p.technology_ids)
        expect(technologyIds.has(t), `${p.id} tech ${t}`).toBe(true);
      for (const m of p.mechanism_ids)
        expect(mechanismIds.has(m), `${p.id} mech ${m}`).toBe(true);
    }
  });

  it("all evidence policy_ids resolve and are reciprocal-safe", () => {
    for (const e of dataset.evidence) {
      for (const pid of e.policy_ids)
        expect(policyIds.has(pid), `${e.id} -> ${pid}`).toBe(true);
      for (const m of e.metrics)
        expect(metricIds.has(m), `${e.id} metric ${m}`).toBe(true);
    }
  });

  it("all outcome references resolve and evidence discusses the policy", () => {
    for (const o of dataset.outcomes) {
      expect(policyIds.has(o.policy_id), o.id).toBe(true);
      expect(metricIds.has(o.metric_id), o.id).toBe(true);
      for (const eid of o.evidence_ids) {
        const ev = evidenceById.get(eid);
        expect(ev, `${o.id} -> ${eid}`).toBeDefined();
        expect(
          ev!.policy_ids.includes(o.policy_id),
          `${o.id}: evidence ${eid} does not discuss ${o.policy_id}`,
        ).toBe(true);
      }
    }
  });

  it("every CAUSAL outcome is backed by experimental or quasi-experimental evidence", () => {
    for (const o of dataset.outcomes.filter((o) => o.inference === "CAUSAL")) {
      const strengths = o.evidence_ids.map((id) => evidenceById.get(id)!.causal_strength);
      expect(
        strengths.some((s) => s === "EXPERIMENTAL" || s === "QUASI_EXPERIMENTAL"),
        o.id,
      ).toBe(true);
    }
  });

  it("all time-series references resolve", () => {
    for (const ts of dataset.time_series) {
      expect(metricIds.has(ts.metric_id), ts.id).toBe(true);
      expect(jurisdictionIds.has(ts.jurisdiction_id), ts.id).toBe(true);
      if (ts.source_evidence_id)
        expect(evidenceIds.has(ts.source_evidence_id), ts.id).toBe(true);
    }
  });

  it("all similarity policy ids resolve", () => {
    for (const s of dataset.similarities) {
      expect(policyIds.has(s.policy_a), s.id).toBe(true);
      expect(policyIds.has(s.policy_b), s.id).toBe(true);
    }
  });

  it("records with non-null URLs are CURATED (or real IMPORTED policies)", () => {
    for (const e of dataset.evidence)
      if (e.source_url) expect(e.data_status, e.id).toBe("CURATED");
    for (const p of dataset.policies)
      for (const s of p.sources)
        if (s.url) expect(["CURATED", "IMPORTED"], p.id).toContain(p.data_status);
  });

  it("imported policies are CPDB records with no linked evidence or outcomes", () => {
    const imported = dataset.policies.filter((p) => p.data_status === "IMPORTED");
    expect(imported.length).toBeGreaterThan(0);
    const importedIds = new Set(imported.map((p) => p.id));
    for (const p of imported) {
      expect(p.id, p.id).toMatch(/^pol_cpdb_\d+$/);
      expect(p.tags, p.id).toContain("cpdb");
      expect(p.sources[0]?.publisher, p.id).toBe("NewClimate Institute");
    }
    for (const e of dataset.evidence)
      for (const pid of e.policy_ids) expect(importedIds.has(pid), e.id).toBe(false);
    for (const o of dataset.outcomes) expect(importedIds.has(o.policy_id), o.id).toBe(false);
  });

  it("DEMO evidence uses the demo publisher and null URL", () => {
    for (const e of dataset.evidence.filter((e) => e.data_status === "DEMO")) {
      expect(e.publisher, e.id).toBe("PACT demo dataset");
      expect(e.source_url, e.id).toBeNull();
    }
  });

  it("ILLUSTRATIVE time-series are DEMO", () => {
    for (const ts of dataset.time_series.filter((t) => t.precision === "ILLUSTRATIVE")) {
      expect(ts.data_status, ts.id).toBe("DEMO");
      expect(ts.note, ts.id).toContain("DEMO DATA");
    }
  });
});
