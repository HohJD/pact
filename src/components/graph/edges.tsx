"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

const EDGE_STYLE: Record<string, { color: string; dash?: string; width: number }> = {
  TARGETS: { color: "#2FD3E6", width: 1 },
  USES_MECHANISM: { color: "#FF9A3D", width: 1 },
  IMPLEMENTED_BY: { color: "#9B7BFF", width: 1 },
  SIMILAR_TO: { color: "#8B919A", dash: "5 4", width: 1.2 },
  SUPPORTED_BY: { color: "#F2C94C", width: 0.8 },
  EVALUATED_BY: { color: "#F2C94C", width: 1.2 },
  ASSOCIATED_WITH: { color: "#3DDC97", width: 1 },
  SUPERSEDES: { color: "#8B919A", dash: "2 3", width: 1 },
};

export type PactEdgeData = {
  relationType: string;
  weight?: number;
  illuminated?: boolean;
  faded?: boolean;
  similarityId?: string;
};

export function PactEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const d = (data ?? {}) as PactEdgeData;
  const style = EDGE_STYLE[d.relationType ?? ""] ?? { color: "#8B919A", width: 1 };
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const opacity = d.faded ? 0.12 : d.illuminated || selected ? 0.9 : 0.32;
  const color = d.illuminated || selected ? style.color : style.color;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: d.illuminated || selected ? style.width + 0.8 : style.width,
          strokeDasharray: style.dash,
          opacity,
        }}
      />
      {d.relationType === "SIMILAR_TO" && selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] text-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {Math.round((d.weight ?? 0) * 100)}% MATCH
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { pact: PactEdge };
