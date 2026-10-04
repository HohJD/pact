import { describe, expect, it } from "vitest";

import { seedDataset } from "@/data/seed";
import type { LLMProvider } from "@/lib/ai/provider";
import { NullProvider } from "@/lib/ai/provider";
import { chunkText } from "./chunk";
import { ExtractedPolicy } from "./schemas";
import { runPipeline } from "./pipeline";

const LONG_TEXT =
  "Germany reformed its heat-pump subsidy in 2024. The BEG scheme offers a 30% base grant for heat pumps, plus income bonuses. " +
  "It is administered by KfW and funded federally. ".repeat(40);

const VALID_POLICY = {
  policy_name: { value: "BEG Einzelmaßnahmen 2024", provenance: { chunk_index: 0, quote: "BEG scheme offers a 30% base grant" } },
  jurisdiction: { value: "Germany", provenance: { chunk_index: 0, quote: "Germany reformed" } },
  country: { value: "DE", provenance: null },
  description: { value: "Heat-pump grant programme", provenance: null },
  sector: { value: "residential buildings", provenance: null },
  technologies: { value: ["Heat pumps"], provenance: null },
  mechanisms: { value: ["GRANT"], provenance: null },
  target_groups: { value: ["owner-occupiers"], provenance: null },
  eligibility: { value: "all households, income bonus", provenance: null },
  incentives: { value: "30% base grant", provenance: null },
  introduced_date: { value: "2024", provenance: null },
  status: { value: "ACTIVE", provenance: null },
  funding: { value: "federal budget via KfW", provenance: null },
  policy_objectives: { value: ["accelerate heat pumps"], provenance: null },
  source: { value: "test", provenance: null },
  confidence: { value: "MEDIUM", provenance: null },
};

function mockProvider(behaviour: (schemaName: string, user: string) => unknown): LLMProvider {
  return {
    isConfigured: () => true,
    embed: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
    chatJSON: async <T,>(opts: { schemaName: string; user: string }): Promise<{ data: T; raw: string; model: string }> => {
      const out = behaviour(opts.schemaName, opts.user);
      if (out instanceof Error) throw out;
      return { data: out as T, raw: JSON.stringify(out), model: "mock" };
    },
  };
}

describe("chunkText", () => {
  it("chunks long text with overlap and sentence boundaries", () => {
    const chunks = chunkText(LONG_TEXT, 1200, 150);
    expect(chunks.length).toBeGreaterThan(1);
    // consecutive chunks share content (overlap)
    const a = chunks[0].slice(-80);
    expect(chunks[1]).toContain(a.slice(0, 20));
    // chunks don't end mid-word messily — most end at sentence boundary or text end
    expect(chunks.slice(0, -1).every((c) => /[.!?]\s*$|\S$/.test(c))).toBe(true);
  });

  it("returns a single chunk for short text", () => {
    expect(chunkText("short text")).toEqual(["short text"]);
  });
});

describe("ExtractedPolicy schema", () => {
  it("rejects malformed output", () => {
    expect(ExtractedPolicy.safeParse({ policy_name: "no provenance wrapper" }).success).toBe(false);
    expect(ExtractedPolicy.safeParse({ policy_name: { value: 42 } }).success).toBe(false);
  });

  it("accepts a valid extraction", () => {
    expect(ExtractedPolicy.safeParse(VALID_POLICY).success).toBe(true);
  });
});

describe("runPipeline", () => {
  it("NEEDS_PROVIDER without an LLM: real extraction + chunking, no fake policy", async () => {
    const res = await runPipeline(
      { kind: "TEXT", text: LONG_TEXT, label: "test" },
      seedDataset,
      new NullProvider(),
    );
    expect(res.status).toBe("NEEDS_PROVIDER");
    expect(res.stagesDone).toContain("CHUNKING");
    expect(res.stagesDone).not.toContain("POLICY EXTRACTION");
    expect(res.draft!.chunkCount).toBeGreaterThan(1);
    expect(res.draft!.policy).toBeNull();
  });

  it("one valid + one malformed chunk → one drafted policy + a warning", async () => {
    let calls = 0;
    const provider = mockProvider((schemaName) => {
      if (schemaName === "policy_extraction") {
        calls += 1;
        if (calls > 1) return new Error("malformed JSON from model");
        return { policies: [VALID_POLICY] };
      }
      if (schemaName === "entity_extraction")
        return { technologies: ["heat pumps"], mechanisms: [], jurisdictions: ["Germany"], metrics: [] };
      return { relations: [] };
    });
    const res = await runPipeline(
      { kind: "TEXT", text: LONG_TEXT, label: "test" },
      seedDataset,
      provider,
    );
    expect(res.status).toBe("IN_REVIEW");
    expect(res.draft!.policy).not.toBeNull();
    expect(res.draft!.policy!.id).toMatch(/^pol_ingest_/);
    expect(res.draft!.policy!.data_status).toBe("DEMO");
    expect(res.draft!.policy!.tags).toContain("ingested");
    expect(res.draft!.policy!.country_code).toBe("DE");
    expect(res.draft!.warnings.some((w) => w.includes("extraction failed"))).toBe(true);
    expect(res.stagesDone).toContain("HUMAN REVIEW");
  });
});
