import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import { Evidence, Policy, TimeSeries } from "@/lib/domain/schema";
import { stripNulls } from "./supabase-repository";

describe("stripNulls", () => {
  it("drops null optionals so Postgres rows parse as Policy", () => {
    const seed = seedDataset.policies[0];
    const row = stripNulls({
      ...seed,
      implementation_notes: null,
      short_name: null,
    });
    const parsed = Policy.parse(row);
    expect(parsed.id).toBe(seed.id);
    expect(row).not.toHaveProperty("implementation_notes");
    expect(row).not.toHaveProperty("short_name");
  });

  it("keeps null on fields the schema models as .nullable()", () => {
    const seed = seedDataset.policies[0];
    const row = stripNulls({ ...seed, ended: null, implementation_notes: null });
    expect(row.ended).toBeNull();
    expect(Policy.parse(row).ended).toBeNull();
  });

  it("keeps null on evidence.source_url and time_series.source_evidence_id", () => {
    const ev = stripNulls({ ...seedDataset.evidence[0], source_url: null });
    expect(ev.source_url).toBeNull();
    expect(Evidence.parse(ev).source_url).toBeNull();

    const ts = stripNulls({
      ...seedDataset.time_series[0],
      source_evidence_id: null,
      note: null,
    });
    expect(ts.source_evidence_id).toBeNull();
    expect(ts).not.toHaveProperty("note");
    expect(TimeSeries.parse(ts).source_evidence_id).toBeNull();
  });
});
