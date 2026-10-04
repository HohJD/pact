import type { Dataset, UIAction } from "@/lib/domain/schema";
import type { useWorkspace } from "@/store/workspace";

type WorkspaceStore = ReturnType<typeof useWorkspace.getState>;

/**
 * Apply analyst UIActions to the workspace store. Pure with respect to the
 * store passed in (so it is unit-testable with the vanilla zustand state).
 * Pass the dataset so node-level effects (e.g. country highlighting) can be
 * resolved to concrete ids.
 */
export function applyUIActions(
  actions: UIAction[],
  store: WorkspaceStore,
  dataset?: Dataset,
): void {
  for (const action of actions) {
    switch (action.type) {
      case "FOCUS_COUNTRY": {
        store.focusCountry(action.country);
        if (dataset) {
          const nodeIds = [
            ...dataset.jurisdictions
              .filter((j) => j.country_code === action.country)
              .map((j) => j.id),
            ...dataset.policies
              .filter((p) => p.country_code === action.country)
              .map((p) => p.id),
          ];
          store.highlight(nodeIds);
        }
        break;
      }
      case "OPEN_POLICY": {
        store.select({ kind: "policy", id: action.policy_id });
        store.openPanel("DETAILS");
        break;
      }
      case "COMPARE_POLICIES": {
        for (const id of action.policy_ids) store.toggleCompare(id);
        store.openPanel("COMPARE");
        break;
      }
      case "FILTER_GRAPH": {
        store.patchFilters({
          ...(action.technology_ids ? { technology_ids: action.technology_ids } : {}),
          ...(action.mechanism_ids ? { mechanism_ids: action.mechanism_ids } : {}),
          ...(action.countries ? { countries: action.countries } : {}),
        });
        break;
      }
      case "SHOW_OUTCOMES": {
        if (action.policy_id) {
          store.select({ kind: "policy", id: action.policy_id });
          store.openPanel("OUTCOMES");
        } else {
          store.setView("OUTCOMES");
          store.openPanel("OUTCOMES");
        }
        break;
      }
      case "SHOW_EVIDENCE": {
        if (action.policy_id) store.select({ kind: "policy", id: action.policy_id });
        if (action.evidence_id) store.select({ kind: "evidence", id: action.evidence_id });
        if (!action.policy_id && !action.evidence_id) store.openPanel("EVIDENCE");
        else store.openPanel("EVIDENCE");
        break;
      }
      case "CHANGE_VIEW": {
        store.setView(action.view);
        break;
      }
      case "HIGHLIGHT_NODES": {
        store.highlight(action.node_ids);
        break;
      }
    }
  }
}
