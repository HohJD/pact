import { SeedRepository } from "@/lib/data/seed-repository";
import type { Dataset, Evidence } from "@/lib/domain/schema";
import { EVIDENCE_EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import type { LLMProvider } from "./provider";
import {
  EvidenceAgentResult,
  ExtractedEvidenceList,
} from "./schemas";

export interface SuppliedSource {
  title: string;
  publisher: string;
  text: string;
  url?: string;
}

/** External evidence discovery — a real search backend can plug in later. */
export interface EvidenceSearchAdapter {
  search(policyId: string, dataset: Dataset): Promise<SuppliedSource[]>;
}

export class NoopSearchAdapter implements EvidenceSearchAdapter {
  async search(): Promise<SuppliedSource[]> {
    return [];
  }
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
  const supplied =
    args.supplied_sources ??
    (await (args.adapter ?? new NoopSearchAdapter()).search(
      args.policy_id,
      dataset,
    ));

  let extracted: Evidence[] = [];
  if (supplied.length > 0 && provider.isConfigured()) {
    try {
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
      extracted = data.records.map((r, i) => ({
        ...r,
        id: `ev_extracted_${args.policy_id}_${i}`,
        policy_ids: [
          ...new Set([args.policy_id, ...r.policy_ids]),
        ].filter((id) => dataset.policies.some((p) => p.id === id)),
        publication_date: r.publication_date || "undated",
        // never invent a URL — only carry one the caller supplied
        source_url: supplied[i]?.url ?? null,
        data_status: "CURATED",
      }));
      notes.push(`Extracted ${extracted.length} record(s) from supplied sources.`);
    } catch (err) {
      notes.push(
        `Extraction failed (${err instanceof Error ? err.name : "unknown"}); showing existing records only.`,
      );
    }
  } else if (supplied.length > 0) {
    notes.push("Sources supplied but no extraction provider configured.");
  }

  const status =
    existing.length === 0 && extracted.length === 0
      ? "INSUFFICIENT_EVIDENCE"
      : "OK";
  if (status === "INSUFFICIENT_EVIDENCE")
    notes.push("PACT holds no evidence for this policy and none was supplied.");

  return {
    status,
    policy_id: args.policy_id,
    existing,
    extracted,
    strength: repo.getEvidenceStrength(args.policy_id),
    notes,
  };
}
