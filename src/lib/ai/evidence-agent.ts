import { createHash } from "node:crypto";

import { SeedRepository } from "@/lib/data/seed-repository";
import type { Dataset, Evidence } from "@/lib/domain/schema";
import { EVIDENCE_EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import type { LLMProvider } from "./provider";
import {
  ExtractedEvidenceList,
  type EvidenceAgentResult,
  type SearchHit,
} from "./schemas";

export interface SuppliedSource {
  title: string;
  publisher: string;
  text: string;
  url?: string;
}

export type { SearchHit };

/** External evidence discovery — Tavily plugs in via TAVILY_API_KEY. */
export interface EvidenceSearchAdapter {
  isConfigured(): boolean;
  search(policyId: string, dataset: Dataset): Promise<SearchHit[]>;
}

export class NoopSearchAdapter implements EvidenceSearchAdapter {
  isConfigured() {
    return false;
  }
  async search(): Promise<SearchHit[]> {
    return [];
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Does the hit actually mention the policy? Relevance guard. */
function mentionsPolicy(hit: SearchHit, names: string[]): boolean {
  const text = `${hit.title} ${hit.snippet}`.toLowerCase();
  return names.some((n) => n && text.includes(n.toLowerCase()));
}

function candidateId(url: string, policyId: string): string {
  const h = createHash("sha1").update(`${policyId}|${url}`).digest("hex");
  return `ev_cand_${h.slice(0, 10)}`;
}

export async function runEvidenceAgent(
  args: {
    policy_id: string;
    supplied_sources?: SuppliedSource[];
    adapter?: EvidenceSearchAdapter;
  },
  dataset: Dataset,
  provider: LLMProvider,
): Promise<EvidenceAgentResult> {
  const repo = new SeedRepository(dataset);
  const policy = dataset.policies.find((p) => p.id === args.policy_id);
  const notes: string[] = [];
  if (!policy) notes.push(`Unknown policy id ${args.policy_id}.`);

  const existing = repo.getEvidenceForPolicy(args.policy_id);
  const extracted: Evidence[] = [];
  const candidates: Evidence[] = [];
  const candidatesUnclassified: SearchHit[] = [];
  let searched = false;

  if (args.supplied_sources?.length && provider.isConfigured()) {
    // supplied documents — human-provided, so records are CURATED
    try {
      const supplied = args.supplied_sources;
      const user = supplied
        .map(
          (s, i) =>
            `SOURCE ${i + 1}: ${s.title} (${s.publisher})${s.url ? ` <${s.url}>` : ""}\n${s.text}`,
        )
        .join("\n\n");
      const { data } = await provider.chatJSON({
        system: EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
        user,
        schema: ExtractedEvidenceList,
        schemaName: "evidence_extraction",
        temperature: 0.1,
        maxTokens: 4000,
      });
      extracted.push(
        ...data.records.map((r, i) => ({
          ...r,
          id: `ev_extracted_${args.policy_id}_${i}`,
          policy_ids: [
            ...new Set([args.policy_id, ...r.policy_ids]),
          ].filter((id) => dataset.policies.some((p) => p.id === id)),
          publication_date: r.publication_date || "undated",
          // never invent a URL — only carry one the caller supplied
          source_url: supplied[i]?.url ?? null,
          data_status: "CURATED" as const,
        })),
      );
      notes.push(`Extracted ${extracted.length} record(s) from supplied sources.`);
    } catch (err) {
      notes.push(
        `Extraction failed (${err instanceof Error ? err.name : "unknown"}); showing existing records only.`,
      );
    }
  } else if (args.supplied_sources?.length) {
    notes.push("Sources supplied but no extraction provider configured.");
  } else {
    // web search — machine-found records, always CANDIDATE
    const adapter = args.adapter ?? new NoopSearchAdapter();
    if (adapter.isConfigured() && policy) {
      searched = true;
      const names = [policy.name, policy.short_name].filter(
        (n): n is string => !!n,
      );
      const hits = (await adapter.search(args.policy_id, dataset))
        .filter((h) => mentionsPolicy(h, names))
        .slice(0, 6);
      notes.push(
        `Web search returned ${hits.length} relevant hit(s) for "${policy.short_name ?? policy.name}".`,
      );

      if (hits.length && provider.isConfigured()) {
        for (const hit of hits) {
          const rec = await classifyHit(hit, policy.id, names, provider);
          if (rec) candidates.push(rec);
        }
        const failed = hits.length - candidates.length;
        if (failed > 0)
          notes.push(`${failed} hit(s) could not be classified and were dropped.`);
      } else if (hits.length) {
        candidatesUnclassified.push(...hits);
        notes.push(
          "Search hits are unclassified — no extraction provider configured.",
        );
      }
    }
  }

  const status =
    existing.length === 0 &&
    extracted.length === 0 &&
    candidates.length === 0 &&
    candidatesUnclassified.length === 0
      ? "INSUFFICIENT_EVIDENCE"
      : "OK";
  if (status === "INSUFFICIENT_EVIDENCE")
    notes.push("PACT holds no evidence for this policy and search found none.");

  return {
    status,
    policy_id: args.policy_id,
    existing,
    extracted,
    candidates,
    candidates_unclassified: candidatesUnclassified,
    strength: repo.getEvidenceStrength(args.policy_id),
    notes,
    source: searched ? "LIVE" : "NONE",
  };
}

/**
 * Classify one search hit into a CANDIDATE evidence record. Only the snippet
 * is available to the model — findings must come from it. The real source URL
 * is the one place a URL may enter the system.
 */
async function classifyHit(
  hit: SearchHit,
  policyId: string,
  names: string[],
  provider: LLMProvider,
): Promise<Evidence | null> {
  try {
    const { data } = await provider.chatJSON({
      system:
        EVIDENCE_EXTRACTION_SYSTEM_PROMPT +
        "\n\nNOTE: only the page title and a short snippet are available — set confidence LOW and keep findings strictly to what the snippet states.",
      user: `SOURCE: ${hit.title} <${hit.url}>\n${hit.snippet}`,
      schema: ExtractedEvidenceList,
      schemaName: "evidence_extraction",
      temperature: 0.1,
      maxTokens: 1200,
    });
    const r = data.records[0];
    if (!r) return null;
    return {
      ...r,
      id: candidateId(hit.url, policyId),
      policy_ids: [policyId],
      publication_date: r.publication_date || hit.published_date || "undated",
      // real URL from search — the only URL the system may introduce
      source_url: hit.url,
      publisher: r.publisher || hostname(hit.url),
      policy_relevance: r.policy_relevance,
      // non-LOW only when the extractor is confident AND the policy is named
      confidence:
        r.confidence === "HIGH" && mentionsPolicy(hit, names)
          ? r.confidence
          : "LOW",
      data_status: "CANDIDATE",
      title: r.title || hit.title,
      methodology:
        r.methodology ||
        "Web-search result classified from a snippet. Verify at source.",
      findings: r.findings.length ? r.findings : [hit.snippet.slice(0, 280)],
    };
  } catch {
    return null;
  }
}
