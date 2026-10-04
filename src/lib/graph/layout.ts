import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import type { GraphEdge } from "@/lib/domain/relations";
import type { GraphNode, GraphNodeKind } from "./build";

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  kind: GraphNodeKind;
}

const LINK_DISTANCE: Record<string, number> = {
  TARGETS: 110,
  USES_MECHANISM: 110,
  IMPLEMENTED_BY: 90,
  SIMILAR_TO: 160,
  SUPPORTED_BY: 70,
  EVALUATED_BY: 70,
  ASSOCIATED_WITH: 70,
  SUPERSEDES: 140,
};

const BASE_RADIUS: Record<GraphNodeKind, number> = {
  technology: 26,
  jurisdiction: 22,
  policy: 18,
  mechanism: 16,
  evidence: 12,
  outcome: 12,
};

/** Deterministic 0..1 hash of a string id. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// policy cards are ~170×64px rectangles — collide on the half-diagonal
const POLICY_COLLIDE_RADIUS = Math.hypot(170 / 2, 64 / 2) + 10;

function nodeRadius(node: GraphNode, degree: number): number {
  if (node.kind === "policy") return POLICY_COLLIDE_RADIUS + Math.min(8, degree);
  return BASE_RADIUS[node.kind] + Math.min(10, degree * 1.5);
}

/**
 * Synchronous force layout. Seeds from previous positions where available so
 * filter changes gently reposition rather than reshuffle.
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  previous?: Map<string, { x: number; y: number }>,
): PositionedNode[] {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const simNodes: SimNode[] = nodes.map((n) => {
    const prev = previous?.get(n.id);
    if (prev) return { id: n.id, kind: n.kind, x: prev.x, y: prev.y };
    // deterministic seed on a ring by kind
    const angle = hash01(n.id) * Math.PI * 2;
    const r = n.kind === "jurisdiction" ? 620 : n.kind === "technology" ? 120 : 300;
    return { id: n.id, kind: n.kind, x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });

  const links: SimulationLinkDatum<SimNode>[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  const sim = forceSimulation(simNodes)
    // seeded with previous positions → reheat gently so nodes settle rather
    // than reshuffle
    .alpha(previous ? 0.3 : 1)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode> & { type?: string }>(links)
        .id((d) => d.id)
        .distance((l) => LINK_DISTANCE[l.type ?? ""] ?? 100)
        .strength(0.4),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength((d) =>
        d.kind === "technology" || d.kind === "jurisdiction" ? -650 : -300,
      ),
    )
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius(
          (d) =>
            nodeRadius(
              nodes.find((n) => n.id === d.id)!,
              degree.get(d.id) ?? 0,
            ) + 10,
        )
        // gentler resolution when seeded — nodes are already near-valid, and
        // hard collide on the enlarged radii would shove them out of place
        .strength(previous ? 0.5 : 1)
        .iterations(3),
    )
    .force("center", forceCenter(0, 0))
    .force(
      "x",
      forceX<SimNode>((d) => {
        if (d.kind === "jurisdiction") return Math.cos(hash01(d.id) * Math.PI * 2) * 640;
        if (d.kind === "technology") return 0;
        return Math.cos(hash01(d.id) * Math.PI * 2) * 220;
      }).strength((d) => (d.kind === "jurisdiction" ? 0.12 : 0.04)),
    )
    .force(
      "y",
      forceY<SimNode>((d) => {
        if (d.kind === "jurisdiction") return Math.sin(hash01(d.id) * Math.PI * 2) * 640;
        if (d.kind === "technology") return 0;
        return Math.sin(hash01(d.id) * Math.PI * 2) * 220;
      }).strength((d) => (d.kind === "jurisdiction" ? 0.12 : 0.04)),
    )
    .stop();

  // a converged graph only needs a short settle pass; a fresh one needs the
  // full run to untangle the seeded ring
  const ticks = previous ? 80 : 300;
  for (let i = 0; i < ticks; i++) sim.tick();

  const byId = new Map(simNodes.map((n) => [n.id, n]));
  return nodes.map((n) => ({
    ...n,
    x: byId.get(n.id)!.x ?? 0,
    y: byId.get(n.id)!.y ?? 0,
  }));
}
