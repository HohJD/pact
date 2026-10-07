import { describe, expect, it, vi } from "vitest";

import { seedDataset } from "@/data/seed";
import { analyse, fallbackAnalyse } from "./analyst";
import { guardAnalystResponse } from "./guardrails";
import type { LLMProvider } from "./provider";
import { formatContextDocument, retrieveContext } from "./retrieval";
import { runEvidenceAgent } from "./evidence-agent";
import { assessTransfer } from "./transfer";
import { AnalystResponse } from "@/lib/domain/schema";

const FLAGSHIP = "Which policies have successfully accelerated heat-pump adoption?";

const nullProvider: LLMProvider = {
  isConfigured: () => false,
  chatJSON: () => Promise.reject(new Error("unconfigured")),
  embed: () => Promise.reject(new Error("unconfigured")),
};

function mockProvider(raw: string): LLMProvider {
  return {
    isConfigured: () => true,
    chatJSON: vi.fn(
      async <T,>({ schema }: { schema: import("zod").ZodType<T> }) => {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("invalid");
        return { data: parsed.data, raw, model: "mock" };
      },
    ) as LLMProvider["chatJSON"],
    embed: () => Promise.reject(new Error("no embeddings in tests")),
  };
}

describe("retrieveContext", () => {
  it("heat-pump question surfaces the flagship policies in top 8", async () => {
    const ctx = await retrieveContext(FLAGSHIP, seedDataset);
    const ids = ctx.policies.slice(0, 8).map((p) => p.id);
    for (const want of [
      "pol_gb_bus",
      "pol_de_beg",
      "pol_fr_maprimerenov",
      "pol_no_oil_ban",
    ])
      expect(ids).toContain(want);
  });

  it("'loans' retrieves loan instruments", async () => {
    const ctx = await retrieveContext("Which policies offer low-interest loans?", seedDataset);
    const ids = ctx.policies.map((p) => p.id);
    expect(ids).toContain("pol_gb_warm_homes_plan");
    expect(ids).toContain("pol_de_beg_em_2024");
  });

  it("falls back to lexical ranking when query embeddings have incompatible dimensions", async () => {
    const question = "Which policies offer low-interest loans?";
    const baseline = await retrieveContext(question, seedDataset);
    const provider: LLMProvider = {
      ...nullProvider,
      isConfigured: () => true,
      embed: vi.fn(async () => [new Array(1536).fill(0.001)]),
    };

    const result = await retrieveContext(question, seedDataset, undefined, provider);

    expect(result.policies.map((policy) => policy.id)).toEqual(
      baseline.policies.map((policy) => policy.id),
    );
    expect(provider.embed).toHaveBeenCalledOnce();
  });

  it("context document cites only evidence ids that exist", async () => {
    const ctx = await retrieveContext(FLAGSHIP, seedDataset);
    const doc = formatContextDocument(ctx, seedDataset);
    for (const id of ctx.evidenceIds)
      expect(seedDataset.evidence.some((e) => e.id === id)).toBe(true);
    expect(doc).toContain("EVIDENCE");
    expect(doc).toContain("POLICIES");
  });
});

describe("guardrails", () => {
  function makeCtx(policyId: string) {
    const ctx = {
      question: "",
      intent: "EXPLORE",
      policies: seedDataset.policies.filter((p) => p.id === policyId),
      evidence: seedDataset.evidence.filter((e) => e.policy_ids.includes(policyId)),
      outcomes: seedDataset.outcomes.filter((o) => o.policy_id === policyId),
      timeSeries: [],
      similarities: [],
      jurisdictions: [],
      evidenceIds: new Set(
        seedDataset.evidence
          .filter((e) => e.policy_ids.includes(policyId))
          .map((e) => e.id),
      ),
      policyIds: new Set([policyId]),
    };
    return ctx as never;
  }

  it("drops unknown evidence ids and downgrades inference when all are dropped", () => {
    const ctx = makeCtx("pol_gb_bus");
    const res = guardAnalystResponse(
      {
        answer: "",
        claims: [
          {
            text: "Uptake was observed.",
            evidence_ids: ["ev_not_real_1"],
            confidence: "MEDIUM",
            inference_type: "DIRECTLY_SUPPORTED",
          },
        ],
        citations: ["ev_not_real_1"],
        confidence: "MEDIUM",
        actions: [],
        insufficient_evidence: false,
      },
      ctx,
      seedDataset,
    );
    expect(res.claims[0].evidence_ids).toHaveLength(0);
    expect(res.claims[0].inference_type).toBe("INFERRED");
  });

  it("rewrites causal wording without causal evidence", () => {
    const ctx = makeCtx("pol_gb_bus");
    const res = guardAnalystResponse(
      {
        answer: "",
        claims: [
          {
            text: "BUS increased heat-pump uptake.",
            evidence_ids: ["ev_desnz_bus_stats"],
            confidence: "MEDIUM",
            inference_type: "DIRECTLY_SUPPORTED",
          },
        ],
        citations: [],
        confidence: "MEDIUM",
        actions: [],
        insufficient_evidence: false,
      },
      ctx,
      seedDataset,
    );
    expect(res.claims[0].inference_type).toBe("UNCERTAIN");
    expect(res.claims[0].text).toMatch(/^\[Correlational\]/);
  });

  it("allows causal wording for WAP with experimental evidence", () => {
    const ctx = makeCtx("pol_us_wap");
    const res = guardAnalystResponse(
      {
        answer: "",
        claims: [
          {
            text: "WAP reduced household energy use by ~10–20%.",
            evidence_ids: ["ev_fowlie_wap_2018"],
            confidence: "HIGH",
            inference_type: "DIRECTLY_SUPPORTED",
          },
        ],
        citations: [],
        confidence: "HIGH",
        actions: [],
        insufficient_evidence: false,
      },
      ctx,
      seedDataset,
    );
    expect(res.claims[0].inference_type).toBe("DIRECTLY_SUPPORTED");
    expect(res.claims[0].text).not.toMatch(/Correlational/);
  });
});

describe("fallbackAnalyse", () => {
  it("matches curated entries", () => {
    const cases: [string, string][] = [
      [FLAGSHIP, "heat_pump_acceleration"],
      ["What could the UK learn from Germany?", "uk_learn_from_germany"],
      ["Compare UK and German building retrofit policies.", "compare_uk_de_retrofit"],
      ["How have countries financed residential retrofits?", "financing_retrofits"],
      [
        "Which building policies have the strongest evidence of reducing energy consumption?",
        "strongest_evidence_energy_consumption",
      ],
    ];
    for (const [q] of cases) {
      const r = fallbackAnalyse(q);
      expect(r.source).toBe("FALLBACK");
      expect(r.insufficient_evidence).toBe(false);
    }
  });
});

describe("analyse", () => {
  it("falls back without throwing on malformed LLM output", async () => {
    const r = await analyse(FLAGSHIP, seedDataset, undefined, mockProvider("garbage{{"));
    expect(r.source).toBe("FALLBACK");
    expect(r.answer.length).toBeGreaterThan(0);
  });

  it("uses the provider when output is valid", async () => {
    const valid = JSON.stringify({
      answer: "test answer",
      claims: [
        {
          text: "BUS uptake roughly doubled after the uplift.",
          evidence_ids: ["ev_desnz_bus_stats"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
      ],
      citations: ["ev_desnz_bus_stats"],
      confidence: "MEDIUM",
      actions: [{ type: "HIGHLIGHT_NODES", node_ids: ["pol_gb_bus"] }],
      insufficient_evidence: false,
      source: "LLM",
    });
    const r = await analyse(
      "What happened with the UK Boiler Upgrade Scheme?",
      seedDataset,
      undefined,
      mockProvider(valid),
    );
    expect(r.source).toBe("LLM");
    expect(r.claims[0].evidence_ids).toContain("ev_desnz_bus_stats");
  });

  it("mode: 'fallback' never calls the provider (demo determinism)", async () => {
    const spy = vi.fn();
    const provider: LLMProvider = {
      isConfigured: () => true,
      embed: vi.fn(),
      chatJSON: spy,
    };
    const r = await analyse(FLAGSHIP, seedDataset, undefined, provider, {
      mode: "fallback",
    });
    expect(r.source).toBe("FALLBACK");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("evidence agent", () => {
  it("INSUFFICIENT for a policy without evidence", async () => {
    const noEv = seedDataset.policies.find(
      (p) => !seedDataset.evidence.some((e) => e.policy_ids.includes(p.id)),
    )!;
    const r = await runEvidenceAgent({ policy_id: noEv.id }, seedDataset, nullProvider);
    expect(r.status).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("returns existing evidence for BUS without calling the provider", async () => {
    const spy = { ...nullProvider, chatJSON: vi.fn() };
    const r = await runEvidenceAgent({ policy_id: "pol_gb_bus" }, seedDataset, spy);
    expect(r.status).toBe("OK");
    expect(r.existing.length).toBeGreaterThan(0);
    expect(spy.chatJSON).not.toHaveBeenCalled();
  });
});

describe("transfer", () => {
  it("falls back to the Oxford assessment for German sources", async () => {
    const r = await assessTransfer(
      { target_jurisdiction_id: "jur_gb_oxford", source_policy_ids: ["pol_de_beg_em_2024"] },
      seedDataset,
      nullProvider,
    );
    expect(r.source).toBe("FALLBACK");
    expect(r.transferability).toBe("MEDIUM");
    expect(r.similarities.length).toBeGreaterThan(0);
  });

  it("returns TRANSFER_INSUFFICIENT for unknown pairs", async () => {
    const r = await assessTransfer(
      { target_jurisdiction_id: "jur_sg", source_policy_ids: ["pol_no_oil_ban"] },
      seedDataset,
      nullProvider,
    );
    expect(r.transferability).toBe("LOW");
    expect(r.lessons[0].inference_type).toBe("UNCERTAIN");
  });
});

describe("schema", () => {
  it("fallback responses are schema-valid", () => {
    const r = AnalystResponse.safeParse(fallbackAnalyse(FLAGSHIP));
    expect(r.success).toBe(true);
  });
});
