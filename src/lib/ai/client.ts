"use client";

import type { AnalystResponse, Dataset, UIAction } from "@/lib/domain/schema";
import { matchFallback } from "@/lib/ai/fallback-content";
import { resolveQuery } from "@/lib/query/resolve";
import { applyUIActions } from "@/lib/ui-actions/apply";
import { useWorkspace } from "@/store/workspace";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sequence actions so the workspace visibly animates. */
export async function applyActionsSequenced(
  actions: AnalystResponse["actions"],
  dataset: Dataset,
  opts: { keepAnswer?: boolean } = {},
) {
  // straight after an answer, actions that would replace the answer in the
  // right panel only highlight their target — "Replay actions" opens them
  if (opts.keepAnswer) actions = mergeHighlights(actions.map(keepAnswerVisible));
  const store = useWorkspace.getState();
  const first = actions.filter((a) => a.type === "CHANGE_VIEW" || a.type === "FILTER_GRAPH");
  const focus = actions.filter((a) => a.type === "FOCUS_COUNTRY");
  const highlight = actions.filter((a) => a.type === "HIGHLIGHT_NODES");
  const rest = actions.filter(
    (a) =>
      a.type !== "CHANGE_VIEW" &&
      a.type !== "FILTER_GRAPH" &&
      a.type !== "FOCUS_COUNTRY" &&
      a.type !== "HIGHLIGHT_NODES",
  );
  if (first.length) applyUIActions(first, store, dataset);
  if (focus.length) {
    await wait(250);
    applyUIActions(focus, useWorkspace.getState(), dataset);
  }
  if (highlight.length) {
    await wait(250);
    applyUIActions(highlight, useWorkspace.getState(), dataset);
  }
  if (rest.length) {
    await wait(250);
    applyUIActions(rest, useWorkspace.getState(), dataset);
  }
}


/** Highlights replace each other — fold them into one, in order. */
function mergeHighlights(actions: UIAction[]): UIAction[] {
  const ids = actions.flatMap((a) => (a.type === "HIGHLIGHT_NODES" ? a.node_ids : []));
  const rest = actions.filter((a) => a.type !== "HIGHLIGHT_NODES");
  return ids.length ? [...rest, { type: "HIGHLIGHT_NODES", node_ids: [...new Set(ids)] }] : rest;
}

function keepAnswerVisible(a: UIAction): UIAction {
  switch (a.type) {
    case "OPEN_POLICY":
      return { type: "HIGHLIGHT_NODES", node_ids: [a.policy_id] };
    case "SHOW_OUTCOMES":
      return a.policy_id ? { type: "HIGHLIGHT_NODES", node_ids: [a.policy_id] } : a;
    case "SHOW_EVIDENCE": {
      const ids = [a.policy_id, a.evidence_id].filter((id): id is string => !!id);
      return ids.length ? { type: "HIGHLIGHT_NODES", node_ids: ids } : a;
    }
    default:
      return a;
  }
}
/**
 * The command-bar flow: instant query/filter response, then POST /api/analyst
 * and apply the returned actions sequentially.
 */
export async function submitAnalystQuestion(
  question: string,
  dataset: Dataset,
  opts?: { demo?: boolean },
): Promise<void> {
  const q = question.trim();
  if (!q) return;
  const store = useWorkspace.getState();

  store.setQuery(q);
  const resolved = resolveQuery(q, dataset);
  // a new question resets query-derived filters but keeps the Sources choice
  store.setFilters({ ...resolved.filters, include_imported: store.filters.include_imported });
  store.highlight([
    ...resolved.highlightTechnologyIds,
    ...dataset.jurisdictions
      .filter((j) => resolved.highlightCountries.includes(j.country_code))
      .map((j) => j.id),
  ]);
  store.saveCurrentSearch();

  store.setAnalystPending(true);
  store.openPanel("ANALYST");

  // demo mode is deterministic — curated response only, no network call
  if (opts?.demo) {
    const data = matchFallback(q);
    // brief pause so the staged actions read as "thinking"
    await wait(300);
    useWorkspace.getState().setAnalyst({ data });
    await applyActionsSequenced(data.actions ?? [], dataset, { keepAnswer: true });
    useWorkspace.getState().setAnalystPending(false);
    return;
  }

  try {
    const s = useWorkspace.getState();
    useWorkspace.getState().setAnalystStreamText("");
    const res = await fetch("/api/analyst/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        workspace: {
          selectedPolicyIds:
            s.selection?.kind === "policy" ? [s.selection.id] : [],
          focusedCountry: s.focusedCountry,
          compareIds: s.compareIds,
          filters: s.filters,
        },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const streamed = await readAnalystStream(res.body);
    useWorkspace.getState().setAnalystStreamText(null);
    if (!streamed) throw new Error("empty analyst stream");
    const { offline, data } = streamed;
    useWorkspace.getState().setAnalyst({ data, model: data.model, offline });
    await applyActionsSequenced(data.actions ?? [], dataset, { keepAnswer: true });
  } catch (err) {
    console.warn("[pact] analyst request failed — using curated response", err);
    // offline → curated fallback so the UI never dead-ends
    const data = matchFallback(q);
    useWorkspace.getState().setAnalyst({ data, offline: true });
  } finally {
    useWorkspace.getState().setAnalystStreamText(null);
    useWorkspace.getState().setAnalystPending(false);
  }
}

/**
 * Reads the /api/analyst/stream SSE body: `delta` events append to the store's
 * streaming text; resolves with the `final` or `fallback` payload.
 */
async function readAnalystStream(
  body: ReadableStream<Uint8Array>,
): Promise<{ data: AnalystResponse & { model?: string }; offline: boolean } | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: (AnalystResponse & { model?: string }) | null = null;
  let offline = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop() ?? "";
    for (const ev of events) {
      const event = ev.split("\n").find((l) => l.startsWith("event:"))?.slice(6).trim();
      const dataLine = ev.split("\n").find((l) => l.startsWith("data:"))?.slice(5);
      if (!event || !dataLine) continue;
      const payload = JSON.parse(dataLine);
      if (event === "delta") {
        useWorkspace.getState().appendAnalystStreamText(payload.text ?? "");
      } else if (event === "final") {
        result = payload;
      } else if (event === "fallback") {
        // server chose the curated path — mark offline so the chip says so
        result = payload;
        offline = true;
      }
    }
  }
  return result ? { data: result, offline } : null;
}
