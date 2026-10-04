import {
  AnalystResponse,
  type Dataset,
} from "@/lib/domain/schema";
import { matchFallback } from "./fallback-content";
import { guardAnalystResponse } from "./guardrails";
import {
  ANALYST_SYSTEM_PROMPT,
  buildAnalystUserMessage,
} from "./prompts";
import { ProviderUnavailableError, type LLMProvider } from "./provider";
import {
  formatContextDocument,
  retrieveContext,
  type WorkspaceContext,
} from "./retrieval";

/** Deterministic offline analyst: first fallback entry whose token groups all match. */
export function fallbackAnalyse(question: string): AnalystResponse {
  return matchFallback(question);
}

/**
 * Streaming variant of `analyse`: same retrieval + guardrails path, but
 * `onDelta` receives fragments of the model's `answer` field as they arrive.
 * Throws when the provider is unavailable or validation fails — the route
 * decides whether to emit a curated fallback.
 */
export async function analyseStreaming(
  question: string,
  dataset: Dataset,
  workspace: WorkspaceContext | undefined,
  provider: LLMProvider,
  onDelta: (text: string) => void,
): Promise<AnalystResponse> {
  if (process.env.PACT_ANALYST_MODE === "fallback" || !provider.isConfigured()) {
    throw new ProviderUnavailableError();
  }
  if (!provider.chatJSONStream) throw new ProviderUnavailableError("no streaming support");

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
  const { data, model } = await provider.chatJSONStream(
    {
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
    },
    onDelta,
  );
  const guarded = guardAnalystResponse(data, ctx, dataset);
  return { ...guarded, source: "LLM", model } as AnalystResponse & {
    model?: string;
  };
}

export async function analyse(
  question: string,
  dataset: Dataset,
  workspace: WorkspaceContext | undefined,
  provider: LLMProvider,
  opts?: { mode?: "live" | "fallback" },
): Promise<AnalystResponse> {
  const mode = opts?.mode ?? process.env.PACT_ANALYST_MODE ?? "live";
  if (mode === "fallback" || !provider.isConfigured()) {
    return fallbackAnalyse(question);
  }

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
    const { data, model } = await provider.chatJSON({
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
    return { ...guarded, source: "LLM", model } as AnalystResponse & {
      model?: string;
    };
  } catch (err) {
    // provider/validation failure → deterministic fallback, never throw
    console.warn(
      `[pact-ai] analyst fell back: ${err instanceof Error ? err.name : "unknown"}`,
    );
    return fallbackAnalyse(question);
  }
}
