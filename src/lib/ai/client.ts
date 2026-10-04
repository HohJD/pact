"use client";

import type { AnalystResponse, Dataset } from "@/lib/domain/schema";
import { resolveQuery } from "@/lib/query/resolve";
import { applyUIActions } from "@/lib/ui-actions/apply";
import { useWorkspace } from "@/store/workspace";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sequence actions so the workspace visibly animates. */
export async function applyActionsSequenced(
  actions: AnalystResponse["actions"],
  dataset: Dataset,
) {
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

/**
 * The command-bar flow: instant query/filter response, then POST /api/analyst
 * and apply the returned actions sequentially.
 */
export async function submitAnalystQuestion(
  question: string,
  dataset: Dataset,
): Promise<void> {
  const q = question.trim();
  if (!q) return;
  const store = useWorkspace.getState();

  store.setQuery(q);
  const resolved = resolveQuery(q, dataset);
  store.setFilters(resolved.filters);
  store.highlight([
    ...resolved.highlightTechnologyIds,
    ...dataset.jurisdictions
      .filter((j) => resolved.highlightCountries.includes(j.country_code))
      .map((j) => j.id),
  ]);
  store.saveCurrentSearch();

  store.setAnalystPending(true);
  store.openPanel("ANALYST");
  try {
    const s = useWorkspace.getState();
    const res = await fetch("/api/analyst", {
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AnalystResponse & { model?: string };
    useWorkspace.getState().setAnalyst({ data, model: data.model });
    await applyActionsSequenced(data.actions ?? [], dataset);
  } catch (err) {
    console.warn("[pact] analyst request failed", err);
    useWorkspace.getState().setAnalyst(null);
  } finally {
    useWorkspace.getState().setAnalystPending(false);
  }
}
