import type { Dataset } from "@/lib/domain/schema";
import { deriveEdges, type GraphEdge } from "@/lib/domain/relations";
import { SeedRepository } from "@/lib/data/seed-repository";
import type { WorkspaceFilter } from "@/store/workspace";

export type GraphNodeKind =
  | "policy"
  | "jurisdiction"
  | "mechanism"
  | "technology"
  | "evidence"
  | "outcome";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** primary entity colour token */
  color: string;
  /** extra per-kind payload used by node renderers */
  meta: Record<string, unknown>;
}

export interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  policyCount: number;
  totalPolicyCount: number;
  truncated: number;
  /** evidence records linked to policies in view (regardless of expansion) */
  linkedEvidenceCount: number;
}

const POLICY_NODE_CAP = 100;

const KIND_COLOR: Record<GraphNodeKind, string> = {
  policy: "#4C8DFF",
  jurisdiction: "#9B7BFF",
  mechanism: "#FF9A3D",
  technology: "#2FD3E6",
  evidence: "#F2C94C",
  outcome: "#3DDC97",
};

export function buildGraph(
  dataset: Dataset,
  filters: WorkspaceFilter = {},
  expanded: Set<string> = new Set(),
): BuiltGraph {
  const repo = new SeedRepository(dataset);
  const { evidence_strength_min, ...policyFilter } = filters;

  let policies = repo.listPolicies(policyFilter);
  if (evidence_strength_min !== undefined && evidence_strength_min > 0) {
    policies = policies.filter(
      (p) => repo.getEvidenceStrength(p.id).score >= evidence_strength_min,
    );
  }

  const totalPolicyCount = policies.length;
  let truncated = 0;
  if (policies.length > POLICY_NODE_CAP) {
    policies = [...policies]
      .sort(
        (a, b) =>
          repo.getEvidenceStrength(b.id).score - repo.getEvidenceStrength(a.id).score,
      )
      .slice(0, POLICY_NODE_CAP);
    truncated = totalPolicyCount - POLICY_NODE_CAP;
  }

  const nodes = new Map<string, GraphNode>();
  const policyIds = new Set(policies.map((p) => p.id));

  for (const p of policies) {
    nodes.set(p.id, {
      id: p.id,
      kind: "policy",
      label: p.short_name ?? p.name,
      color: KIND_COLOR.policy,
      meta: {
        name: p.name,
        country_code: p.country_code,
        status: p.status,
        data_status: p.data_status,
        evidenceScore: repo.getEvidenceStrength(p.id).score,
        expanded: expanded.has(p.id),
      },
    });
  }

  const jurisdictionIds = new Set(policies.map((p) => p.jurisdiction_id));
  for (const j of dataset.jurisdictions) {
    if (!jurisdictionIds.has(j.id)) continue;
    nodes.set(j.id, {
      id: j.id,
      kind: "jurisdiction",
      label: j.name,
      color: KIND_COLOR.jurisdiction,
      meta: { level: j.level, country_code: j.country_code },
    });
  }

  const technologyIds = new Set(policies.flatMap((p) => p.technology_ids));
  for (const t of dataset.technologies) {
    if (!technologyIds.has(t.id)) continue;
    nodes.set(t.id, {
      id: t.id,
      kind: "technology",
      label: t.name,
      color: KIND_COLOR.technology,
      meta: { description: t.description },
    });
  }

  const mechanismIds = new Set(policies.flatMap((p) => p.mechanism_ids));
  for (const m of dataset.mechanisms) {
    if (!mechanismIds.has(m.id)) continue;
    nodes.set(m.id, {
      id: m.id,
      kind: "mechanism",
      label: m.name,
      color: KIND_COLOR.mechanism,
      meta: { kindLabel: m.kind, description: m.description },
    });
  }

  const expandedIds = new Set([...expanded].filter((id) => policyIds.has(id)));

  for (const e of dataset.evidence) {
    const linked = e.policy_ids.some((pid) => expandedIds.has(pid));
    if (!linked) continue;
    nodes.set(e.id, {
      id: e.id,
      kind: "evidence",
      label: e.title,
      color: KIND_COLOR.evidence,
      meta: {
        publisher: e.publisher,
        evidence_type: e.evidence_type,
        causal_strength: e.causal_strength,
        policy_relevance: e.policy_relevance,
        data_status: e.data_status,
      },
    });
  }

  for (const o of dataset.outcomes) {
    if (!expandedIds.has(o.policy_id)) continue;
    nodes.set(o.id, {
      id: o.id,
      kind: "outcome",
      label: o.headline,
      color: KIND_COLOR.outcome,
      meta: { direction: o.direction, inference: o.inference, period: o.period },
    });
  }

  const linkedEvidenceCount = dataset.evidence.filter((e) =>
    e.policy_ids.some((pid) => policyIds.has(pid)),
  ).length;

  const edges = deriveEdges(dataset).filter((e) => {
    if (!nodes.has(e.source) || !nodes.has(e.target)) return false;
    if (e.type === "SIMILAR_TO" && (e.weight ?? 0) < 0.65) return false;
    return true;
  });

  return {
    nodes: [...nodes.values()],
    edges,
    policyCount: policies.length,
    totalPolicyCount,
    truncated,
    linkedEvidenceCount,
  };
}
