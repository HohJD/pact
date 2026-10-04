import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CausalStrength, EvidenceType, Outcome } from "@/lib/domain/schema";

const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0001_init.sql"),
  "utf8",
);

/**
 * Cheap drift guard: the SQL schema must name every domain table and every
 * value of the enums that matter most (causal strength, evidence type,
 * outcome inference). Add more enums here if they drift.
 */
describe("supabase migration", () => {
  it("creates every domain table", () => {
    for (const t of [
      "jurisdictions",
      "technologies",
      "mechanisms",
      "metrics",
      "policies",
      "evidence",
      "outcomes",
      "time_series",
      "similarities",
      "policy_embeddings",
      "evidence_embeddings",
      "ingest_sources",
      "ingest_jobs",
    ]) {
      expect(sql, `missing table ${t}`).toContain(`create table ${t}`);
    }
  });

  it("covers every causal_strength value", () => {
    for (const v of CausalStrength.options) expect(sql).toContain(`'${v}'`);
  });

  it("covers every evidence_type value", () => {
    for (const v of EvidenceType.options) expect(sql).toContain(`'${v}'`);
  });

  it("covers every outcome inference value", () => {
    for (const v of Outcome.shape.inference.options) expect(sql).toContain(`'${v}'`);
  });
});
