import {
  AnalystResponse,
  type Dataset,
} from "@/lib/domain/schema";
import {
  FALLBACK_GENERIC,
  FALLBACK_RESPONSES,
} from "./fallback-content";
import { guardAnalystResponse } from "./guardrails";
import {
  ANALYST_SYSTEM_PROMPT,
  buildAnalystUserMessage,
} from "./prompts";
import type { LLMProvider } from "./provider";
import {
  formatContextDocument,
  retrieveContext,
  type WorkspaceContext,
} from "./retrieval";

/** Deterministic offline analyst: first fallback entry whose token groups all match. */
export function fallbackAnalyse(question: string): AnalystResponse {
  const q = question.toLowerCase();
  for (const entry of FALLBACK_RESPONSES) {
    const match = entry.must.every((group) =>
      group.some((tok) => q.includes(tok.toLowerCase())),
    );
    if (match) return { ...entry.response, source: "FALLBACK" };
  }
  return { ...FALLBACK_GENERIC, source: "FALLBACK" };
}

export async function analyse(
  question: string,
  dataset: Dataset,
  workspace: WorkspaceContext | undefined,
  provider: LLMProvider,
): Promise<AnalystResponse> {
  if (!provider.isConfigured()) return fallbackAnalyse(question);

  try {
    const ctx = await retrieveContext(question, dataset, workspace, provider);
    const workspaceState = JSON.stringify(
      {
        view: undefined,
        selected_policies: workspace?.selectedPolicyIds ?? [],
        comparing: workspace?.compareIds ?? [],
        focused_country: workspace?.focusedCountry ?? null,
        filters: workspace?.filters ?? {},
      },
      null,
      0,
    );
    const { data } = await provider.chatJSON({
      system: ANALYST_SYSTEM_PROMPT,
      user: buildAnalystUserMessage({
        question,
        contextDocument: formatContextDocument(ctx, dataset),
        workspaceState,
      }),
      schema: AnalystResponse,
      schemaName: "analyst",
      temperature: 0.2,
      maxTokens: 4000,
    });
    const guarded = guardAnalystResponse(data, ctx, dataset);
    return { ...guarded, source: "LLM" };
  } catch (err) {
    // provider/validation failure → deterministic fallback, never throw
    console.warn(
      `[pact-ai] analyst fell back: ${err instanceof Error ? err.name : "unknown"}`,
    );
    return fallbackAnalyse(question);
  }
}
