import { z } from "zod";

import { RelationType, type Dataset } from "./schema";

export type GraphRelationType = z.infer<typeof RelationType>;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphRelationType;
  weight?: number;
}

/** policy_id → the policy it replaced, per catalogue notes. */
const SUPERSEDES_PAIRS: Array<[string, string]> = [
  ["pol_gb_bus", "pol_gb_rhi_domestic"],
  ["pol_de_beg", "pol_de_map"],
  ["pol_de_beg", "pol_de_kfw_effizienzhaus"],
  ["pol_fr_maprimerenov", "pol_fr_cite"],
];

const EVALUATING_TYPES = new Set(["GOVERNMENT_EVALUATION", "ACADEMIC_STUDY"]);

export function deriveEdges(dataset: Dataset): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const policy of dataset.policies) {
    edges.push({
      id: `e_${policy.id}_jur`,
      source: policy.id,
      target: policy.jurisdiction_id,
      type: "IMPLEMENTED_BY",
    });
    for (const mech of policy.mechanism_ids) {
      edges.push({
        id: `e_${policy.id}_mech_${mech}`,
        source: policy.id,
        target: mech,
        type: "USES_MECHANISM",
      });
    }
    for (const tech of policy.technology_ids) {
      edges.push({
        id: `e_${policy.id}_tech_${tech}`,
        source: policy.id,
        target: tech,
        type: "TARGETS",
      });
    }
  }

  for (const ev of dataset.evidence) {
    const type: GraphRelationType = EVALUATING_TYPES.has(ev.evidence_type)
      ? "EVALUATED_BY"
      : "SUPPORTED_BY";
    for (const pid of ev.policy_ids) {
      edges.push({ id: `e_${pid}_ev_${ev.id}`, source: pid, target: ev.id, type });
    }
  }

  for (const outcome of dataset.outcomes) {
    edges.push({
      id: `e_${outcome.policy_id}_out_${outcome.id}`,
      source: outcome.policy_id,
      target: outcome.id,
      type: "ASSOCIATED_WITH",
    });
  }

  for (const sim of dataset.similarities) {
    edges.push({
      id: `e_${sim.id}`,
      source: sim.policy_a,
      target: sim.policy_b,
      type: "SIMILAR_TO",
      weight: sim.breakdown.overall,
    });
  }

  for (const [newer, older] of SUPERSEDES_PAIRS) {
    edges.push({
      id: `e_supersedes_${newer}_${older}`,
      source: newer,
      target: older,
      type: "SUPERSEDES",
    });
  }

  return edges;
}
