import { describe, expect, it } from "vitest";

import type { UIAction } from "@/lib/domain/schema";
import { seedDataset } from "@/data/seed";
import { useWorkspace } from "@/store/workspace";
import { applyUIActions } from "./apply";

const store = () => useWorkspace.getState();

function reset() {
  useWorkspace.getState().reset();
}

describe("applyUIActions", () => {
  it("OPEN_POLICY selects and opens DETAILS", () => {
    reset();
    applyUIActions([{ type: "OPEN_POLICY", policy_id: "pol_gb_bus" }], store());
    const s = store();
    expect(s.selection).toEqual({ kind: "policy", id: "pol_gb_bus" });
    expect(s.panel).toBe("DETAILS");
  });

  it("COMPARE_POLICIES sets compare ids and panel", () => {
    reset();
    applyUIActions(
      [{ type: "COMPARE_POLICIES", policy_ids: ["pol_gb_bus", "pol_nl_isde"] }],
      store(),
    );
    const s = store();
    expect(s.compareIds).toEqual(["pol_gb_bus", "pol_nl_isde"]);
    expect(s.panel).toBe("COMPARE");
  });

  it("FILTER_GRAPH patches filters", () => {
    reset();
    const actions: UIAction[] = [
      { type: "FILTER_GRAPH", technology_ids: ["tech_heat_pump"], countries: ["DE"] },
    ];
    applyUIActions(actions, store());
    expect(store().filters.technology_ids).toEqual(["tech_heat_pump"]);
    expect(store().filters.countries).toEqual(["DE"]);
  });

  it("FOCUS_COUNTRY sets focus and highlights country nodes when dataset given", () => {
    reset();
    applyUIActions([{ type: "FOCUS_COUNTRY", country: "DK" }], store(), seedDataset);
    const s = store();
    expect(s.focusedCountry).toBe("DK");
    expect(s.highlighted.has("jur_dk")).toBe(true);
    expect(s.highlighted.has("pol_dk_bygningspulje")).toBe(true);
    expect(s.highlighted.has("pol_gb_bus")).toBe(false);
  });

  it("SHOW_OUTCOMES with policy selects it and opens OUTCOMES", () => {
    reset();
    applyUIActions([{ type: "SHOW_OUTCOMES", policy_id: "pol_us_wap" }], store());
    const s = store();
    expect(s.selection?.id).toBe("pol_us_wap");
    expect(s.panel).toBe("OUTCOMES");
  });

  it("SHOW_OUTCOMES without policy switches view", () => {
    reset();
    applyUIActions([{ type: "SHOW_OUTCOMES" }], store());
    expect(store().view).toBe("OUTCOMES");
  });

  it("CHANGE_VIEW switches view", () => {
    reset();
    applyUIActions([{ type: "CHANGE_VIEW", view: "MAP" }], store());
    expect(store().view).toBe("MAP");
  });

  it("HIGHLIGHT_NODES sets the highlight set", () => {
    reset();
    applyUIActions([{ type: "HIGHLIGHT_NODES", node_ids: ["pol_gb_bus", "jur_gb"] }], store());
    expect(store().highlighted.has("pol_gb_bus")).toBe(true);
    expect(store().highlighted.size).toBe(2);
  });
});
