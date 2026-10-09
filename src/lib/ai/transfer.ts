import type { Dataset, Policy } from "@/lib/domain/schema";
import type { TransferAssessment } from "./transfer-fallback";
import {
  TRANSFER_FALLBACKS,
  TRANSFER_INSUFFICIENT,
} from "./transfer-fallback";
import { guardAnalystResponse } from "./guardrails";
import { TRANSFER_SYSTEM_PROMPT } from "./prompts";
import { LLMOutputError, type LLMProvider } from "./provider";
import {
  formatContextDocument,
  retrieveContext,
} from "./retrieval";
import { TransferAssessmentSchema } from "./schemas";

export interface TransferRequest {
  target_jurisdiction_id: string;
  source_policy_ids?: string[];
  source_country?: string;
  question?: string;
}

function fallbackTransfer(
  targetId: string,
  sourceIds: string[],
): TransferAssessment {
  const hit = TRANSFER_FALLBACKS.find(
    (f) =>
      f.target_jurisdiction_ids.includes(targetId) &&
      (sourceIds.length === 0 ||
        f.source_policy_ids.some((id) => sourceIds.includes(id))),
  );
  return { ...(hit?.assessment ?? TRANSFER_INSUFFICIENT), source: "FALLBACK" };
}

export async function assessTransfer(
  req: TransferRequest,
  dataset: Dataset,
  provider: LLMProvider,
): Promise<TransferAssessment> {
  // resolve source policies
  let sources: Policy[] = (req.source_policy_ids ?? [])
    .map((id) => dataset.policies.find((p) => p.id === id))
    .filter((p): p is Policy => !!p);
  if (sources.length === 0 && req.source_country) {
    const ctx = await retrieveContext(
      req.question ?? `${req.source_country} retrofit heat pump policy`,
      dataset,
      undefined,
      provider?.isConfigured() ? provider : undefined,
    );
    sources = ctx.policies.filter((p) => p.country_code === req.source_country).slice(0, 4);
  }

  const sourceIds = sources.map((p) => p.id);
  if (!provider.isConfigured() || sources.length === 0) {
    return fallbackTransfer(req.target_jurisdiction_id, sourceIds);
  }

  try {
    const question = req.question ?? "assess transferability";
    const ctx = await retrieveContext(
      question,
      dataset,
      { selectedPolicyIds: sourceIds },
      provider,
    );
    for (const p of sources)
      if (!ctx.policies.includes(p)) ctx.policies.push(p);
    ctx.policyIds = new Set(ctx.policies.map((p) => p.id));
    // pull evidence for the full source set
    const evIds = new Set(ctx.evidence.map((e) => e.id));
    for (const e of dataset.evidence)
      if (!evIds.has(e.id) && e.policy_ids.some((id) => ctx.policyIds.has(id)) && ctx.evidence.length < 20) {
        ctx.evidence.push(e);
        evIds.add(e.id);
      }
    ctx.evidenceIds = evIds;

    const target = dataset.jurisdictions.find(
      (j) => j.id === req.target_jurisdiction_id,
    );
    const targetSection = target
      ? `\n\nTARGET JURISDICTION\n- ${target.id} | ${target.name} (${target.country_code}, ${target.level}) | heating: ${target.context.dominant_heating}; owner-occupier ${target.context.owner_occupier_share}; elec/gas price ratio ${target.context.electricity_gas_price_ratio} | ${target.context.housing_stock_note}`
      : `\n\nTARGET JURISDICTION\n- ${req.target_jurisdiction_id} (not in dataset)`;

    const { data } = await provider.chatJSON({
      system: TRANSFER_SYSTEM_PROMPT,
      user: `${formatContextDocument(ctx, dataset)}${targetSection}\n\nSOURCE POLICIES: ${sourceIds.join(", ")}\nQUESTION: ${question}`,
      schema: TransferAssessmentSchema,
      schemaName: "transfer",
      temperature: 0.2,
      maxTokens: 3000,
    });

    const guarded = guardAnalystResponse(
      {
        answer: "",
        claims: data.lessons,
        citations: [],
        confidence: data.evidence_confidence,
        actions: data.actions,
        insufficient_evidence: false,
      },
      ctx,
      dataset,
    );
    return { ...data, lessons: guarded.claims, actions: guarded.actions, source: "LLM" };
  } catch (err) {
    console.warn(
      `[pact-ai] transfer fell back: ${err instanceof Error ? `${err.name}: ${err.message}` : "unknown"}${
        err instanceof LLMOutputError && err.raw ? ` raw=${err.raw.slice(0, 400)}` : ""
      }`,
    );
    return fallbackTransfer(req.target_jurisdiction_id, sourceIds);
  }
}
