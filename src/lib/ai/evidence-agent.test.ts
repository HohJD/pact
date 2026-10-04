import { describe, expect, it, vi } from "vitest";

import { seedDataset } from "@/data/seed";
import { SeedRepository } from "@/lib/data/seed-repository";
import type { Evidence } from "@/lib/domain/schema";
import { cleanFindings, runEvidenceAgent, type EvidenceSearchAdapter } from "./evidence-agent";
import type { LLMProvider } from "./provider";
import { classifyHost, govLabel } from "./search/publishers";
import { TavilySearchAdapter } from "./search/tavily";

const nullProvider: LLMProvider = {
  isConfigured: () => false,
  chatJSON: () => Promise.reject(new Error("unconfigured")),
  embed: () => Promise.reject(new Error("unconfigured")),
};

function classifyingProvider(
  evidenceType = "GOVERNMENT_EVALUATION",
  causalStrength = "DESCRIPTIVE",
): LLMProvider {
  return {
    isConfigured: () => true,
    embed: vi.fn(),
    chatJSON: vi.fn(async () => ({
      model: "mock",
      raw: "{}",
      data: {
        records: [
          {
            title: "Bus Impact Evaluation",
            publisher: "",
            authors: [],
            publication_date: "2024",
            source_url: null,
            evidence_type: evidenceType,
            methodology: "",
            geography: ["GB"],
            policy_ids: [],
            policy_relevance: "EVALUATES",
            metrics: [],
            findings: ["Applications doubled after the grant increase."],
            limitations: [],
            confidence: "LOW",
            causal_strength: causalStrength,
          },
        ],
      },
    })) as LLMProvider["chatJSON"],
  };
}

const busPolicy = seedDataset.policies.find((p) => p.id === "pol_gb_bus")!;

function adapter(hits: { title: string; url: string; snippet: string }[]) {
  return {
    isConfigured: () => true,
    search: vi.fn(async () => hits.map((h) => ({ ...h, score: 1 }))),
  } satisfies EvidenceSearchAdapter;
}

describe("TavilySearchAdapter", () => {
  it("is unconfigured without TAVILY_API_KEY and never fetches", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const a = new TavilySearchAdapter(undefined);
    expect(a.isConfigured()).toBe(false);
    expect(await a.search("pol_gb_bus", seedDataset)).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("runEvidenceAgent with a search adapter", () => {
  it("drops hits whose snippet never mentions the policy", async () => {
    const a = adapter([
      { title: "Boiler Upgrade Scheme statistics", url: "https://gov.uk/bus", snippet: "The Boiler Upgrade Scheme saw applications rise in 2024." },
      { title: "Unrelated report", url: "https://x.org/other", snippet: "Nothing relevant here at all." },
    ]);
    const r = await runEvidenceAgent(
      { policy_id: "pol_gb_bus", adapter: a },
      seedDataset,
      classifyingProvider(),
    );
    expect(a.search).toHaveBeenCalled();
    expect(r.source).toBe("LIVE");
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].data_status).toBe("CANDIDATE");
    expect(r.candidates[0].source_url).toBe("https://gov.uk/bus");
    expect(r.candidates[0].confidence).toBe("LOW");
    expect(r.candidates[0].id).toMatch(/^ev_cand_/);
  });

  it("returns unclassified hits when no provider is configured", async () => {
    const a = adapter([
      { title: "Boiler Upgrade Scheme review", url: "https://gov.uk/bus2", snippet: "Boiler Upgrade Scheme review." },
    ]);
    const r = await runEvidenceAgent(
      { policy_id: "pol_gb_bus", adapter: a },
      seedDataset,
      nullProvider,
    );
    expect(r.candidates).toHaveLength(0);
    expect(r.candidates_unclassified).toHaveLength(1);
    expect(r.status).toBe("OK");
  });

  it("CANDIDATE evidence never counts toward evidence strength", () => {
    const repo = new SeedRepository(seedDataset);
    const before = repo.getEvidenceStrength("pol_gb_bus");
    const cand: Evidence = {
      id: "ev_cand_test1",
      title: "Candidate record",
      publisher: "example.org",
      authors: [],
      publication_date: "2024",
      source_url: "https://example.org/x",
      evidence_type: "GOVERNMENT_EVALUATION",
      methodology: "snippet",
      geography: ["GB"],
      policy_ids: ["pol_gb_bus"],
      policy_relevance: "EVALUATES",
      metrics: [],
      findings: ["f"],
      limitations: [],
      confidence: "LOW",
      causal_strength: "EXPERIMENTAL",
      data_status: "CANDIDATE",
    };
    const ds = { ...seedDataset, evidence: [...seedDataset.evidence, cand] };
    const after = new SeedRepository(ds).getEvidenceStrength("pol_gb_bus");
    expect(after.score).toBe(before.score);
    expect(after.counts.candidate).toBe(before.counts.candidate + 1);
  });

  it("downgrades OFFICIAL_STATISTICS claims from non-government hosts", async () => {
    const a = adapter([
      { title: "Boiler Upgrade Scheme statistics roundup", url: "https://homeenergyquotes.co.uk/bus", snippet: "The Boiler Upgrade Scheme saw applications rise." },
    ]);
    const provider = classifyingProvider("OFFICIAL_STATISTICS", "CORRELATIONAL");
    const r = await runEvidenceAgent(
      { policy_id: "pol_gb_bus", adapter: a },
      seedDataset,
      provider,
    );
    expect(r.candidates[0].evidence_type).toBe("INDUSTRY_REPORT");
    expect(r.candidates[0].causal_strength).toBe("DESCRIPTIVE");
    expect(r.candidates[0].publisher).toBe("homeenergyquotes.co.uk");
  });

  it("keeps OFFICIAL_STATISTICS from government hosts with a gov label", async () => {
    const a = adapter([
      { title: "Boiler Upgrade Scheme statistics", url: "https://www.gov.uk/government/statistics/bus", snippet: "Boiler Upgrade Scheme monthly statistics." },
    ]);
    const provider = classifyingProvider("OFFICIAL_STATISTICS", "DESCRIPTIVE");
    const r = await runEvidenceAgent(
      { policy_id: "pol_gb_bus", adapter: a },
      seedDataset,
      provider,
    );
    expect(r.candidates[0].evidence_type).toBe("OFFICIAL_STATISTICS");
    expect(r.candidates[0].publisher).toBe("GOV.UK (HM Government)");
  });

  it("mentions the policy via short_name too", async () => {
    const a = adapter([
      { title: "Stats", url: "https://s.io/1", snippet: `${busPolicy.short_name} uptake grew.` },
    ]);
    const r = await runEvidenceAgent(
      { policy_id: "pol_gb_bus", adapter: a },
      seedDataset,
      nullProvider,
    );
    expect(r.candidates_unclassified).toHaveLength(1);
  });
});

describe("classifyHost", () => {
  it("classifies government, academic, institutional and other hosts", () => {
    expect(classifyHost("www.gov.uk")).toBe("GOVERNMENT");
    expect(classifyHost("anah.gouv.fr")).toBe("GOVERNMENT");
    expect(classifyHost("bafa.de")).toBe("GOVERNMENT");
    expect(classifyHost("ssb.no")).toBe("GOVERNMENT");
    expect(classifyHost("europa.eu")).toBe("GOVERNMENT");
    expect(classifyHost("doi.org")).toBe("ACADEMIC");
    expect(classifyHost("ox.ac.uk")).toBe("ACADEMIC");
    expect(classifyHost("nber.org")).toBe("ACADEMIC");
    expect(classifyHost("iea.org")).toBe("INSTITUTIONAL");
    expect(classifyHost("agora-energiewende.de")).toBe("INSTITUTIONAL");
    expect(classifyHost("homeenergyquotes.co.uk")).toBe("OTHER");
    expect(classifyHost("random-blog.example")).toBe("OTHER");
  });

  it("govLabel maps known hosts and falls back to the hostname", () => {
    expect(govLabel("www.gov.uk")).toBe("GOV.UK (HM Government)");
    expect(govLabel("ssb.no")).toBe("Statistics Norway");
    expect(govLabel("custom.gov.xx")).toBe("custom.gov.xx");
  });
});

describe("cleanFindings", () => {
  it("drops page boilerplate, title-echoing junk and non-sentences", () => {
    const out = cleanFindings(
      [
        "Title: UK Boiler Upgrade Scheme Hits Record Heat Pump Uptake in 2025 Latest Building Products Industry News From BRG Building Solutions. # News & Press.",
        "Applications doubled after the £7,500 grant uplift in 2023.",
        "short",
        "Subscribe to our newsletter for updates on heating policy today now",
      ],
      "Boiler Upgrade Scheme statistics",
    );
    expect(out).toEqual([
      "Applications doubled after the £7,500 grant uplift in 2023.",
    ]);
  });

  it("strips the hit title out of surviving findings", () => {
    const out = cleanFindings(
      ["According to Boiler Upgrade Scheme statistics, uptake rose steadily through 2024."],
      "Boiler Upgrade Scheme statistics",
    );
    expect(out[0]).not.toMatch(/Boiler Upgrade Scheme statistics/);
    expect(out[0]).toMatch(/uptake rose steadily/);
  });
});
