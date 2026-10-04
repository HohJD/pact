"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import "@xyflow/react/dist/style.css";

import { useDataset } from "@/components/providers/dataset-provider";
import { buildGraph, type GraphNode } from "@/lib/graph/build";
import { layoutGraph } from "@/lib/graph/layout";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { edgeTypes } from "./edges";
import { nodeTypes, type PactNodeData } from "./nodes";
import { useAnimatedPositions } from "./use-animated-positions";

const ENTITY_LEGEND: Array<[string, string]> = [
  ["Policy", "#4C8DFF"],
  ["Jurisdiction", "#9B7BFF"],
  ["Mechanism", "#FF9A3D"],
  ["Technology", "#2FD3E6"],
  ["Evidence", "#F2C94C"],
  ["Outcome", "#3DDC97"],
];

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  kind: string;
  meta: string;
}

function tooltipMeta(n: GraphNode): string {
  switch (n.kind) {
    case "policy":
      return `${n.meta.country_code} · ${String(n.meta.status).toLowerCase()}`;
    case "jurisdiction":
      return String(n.meta.level ?? "").toLowerCase();
    case "mechanism":
      return String(n.meta.kindLabel ?? "").toLowerCase();
    case "evidence":
      return String(n.meta.causal_strength ?? "").toLowerCase().replace(/_/g, " ");
    case "outcome":
      return String(n.meta.period ?? "");
    default:
      return "";
  }
}

function Canvas() {
  const dataset = useDataset();
  const filters = useWorkspace((s) => s.filters);
  const expanded = useWorkspace((s) => s.expanded);
  const selection = useWorkspace((s) => s.selection);
  const highlighted = useWorkspace((s) => s.highlighted);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const expandNode = useWorkspace((s) => s.expandNode);
  const collapseNode = useWorkspace((s) => s.collapseNode);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const focusCountry = useWorkspace((s) => s.focusCountry);
  const { setCenter, fitView } = useReactFlow();

  const built = useMemo(
    () => buildGraph(dataset, filters, expanded),
    [dataset, filters, expanded],
  );

  const [prevPositions] = useState(() => new Map<string, { x: number; y: number }>());
  const positioned = useMemo(
    () => layoutGraph(built.nodes, built.edges, prevPositions),
    [built, prevPositions],
  );
  useEffect(() => {
    prevPositions.clear();
    for (const n of positioned) prevPositions.set(n.id, { x: n.x, y: n.y });
  }, [positioned, prevPositions]);

  const targets = useMemo(
    () => new Map(positioned.map((n) => [n.id, { x: n.x, y: n.y }])),
    [positioned],
  );
  const positions = useAnimatedPositions(targets);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const positionedById = useMemo(
    () => new Map(positioned.map((n) => [n.id, n])),
    [positioned],
  );

  const selectionId = selection?.kind !== "edge" ? selection?.id : undefined;
  const hasHighlight = highlighted.size > 0;

  const nodes: Node<PactNodeData>[] = useMemo(
    () =>
      positioned.map((n) => {
        const glow = highlighted.has(n.id);
        const dim = hasHighlight && !glow;
        const pos = positions.get(n.id) ?? { x: n.x, y: n.y };
        return {
          id: n.id,
          type: n.kind,
          position: pos,
          selected: selectionId === n.id,
          data: {
            label: n.label,
            color: n.color,
            meta: n.meta,
            dim,
            glow,
          },
        };
      }),
    [positioned, positions, highlighted, hasHighlight, selectionId],
  );

  const edges: Edge[] = useMemo(
    () =>
      built.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "pact",
        selected: selection?.kind === "edge" && selection.id === e.id,
        data: {
          relationType: e.type,
          weight: e.weight,
          similarityId: e.type === "SIMILAR_TO" ? e.id.replace(/^e_/, "") : undefined,
          illuminated:
            !!selectionId && (e.source === selectionId || e.target === selectionId),
          faded:
            !!selectionId && e.source !== selectionId && e.target !== selectionId,
        },
      })),
    [built.edges, selection, selectionId],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const kind = node.type ?? "policy";
      select({ kind: kind as never, id: node.id });
      openPanel(kind === "policy" ? "DETAILS" : "DETAILS");
      setCenter(node.position.x + 95, node.position.y + 30, {
        zoom: 1.15,
        duration: 500,
      });
      setMenu(null);
    },
    [select, openPanel, setCenter],
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.type !== "policy") return;
      if (expanded.has(node.id)) collapseNode(node.id);
      else expandNode(node.id);
    },
    [expanded, expandNode, collapseNode],
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
  }, []);

  const onEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      if ((edge.data as { relationType?: string })?.relationType === "SIMILAR_TO") {
        select({ kind: "edge", id: edge.id });
        openPanel("SIMILARITY");
      }
    },
    [select, openPanel],
  );

  const onNodeMouseEnter = useCallback(
    (e: React.MouseEvent, node: Node) => {
      const n = positionedById.get(node.id);
      if (!n) return;
      setTooltip({
        x: e.clientX + 12,
        y: e.clientY + 12,
        title: n.label,
        kind: n.kind,
        meta: tooltipMeta(n),
      });
    },
    [positionedById],
  );

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const menuNode = menu ? positionedById.get(menu.nodeId) : null;

  return (
    <div className="relative h-full w-full">
      {/* header strip */}
      <div className="glass absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <span>
          <b className="font-medium text-foreground">{built.policyCount}</b> policies
          {built.truncated > 0 && (
            <span className="text-entity-evidence"> · +{built.truncated} more</span>
          )}
          {" · "}
          {built.nodes.filter((n) => n.kind === "jurisdiction").length} jurisdictions
          {" · "}
          {built.linkedEvidenceCount} evidence
        </span>
        <button
          type="button"
          onClick={() => fitView({ duration: 400, padding: 0.15 })}
          className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase hover:text-foreground"
        >
          Fit
        </button>
      </div>

      {/* legend */}
      <div className="glass absolute right-3 top-3 z-10 flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
        {ENTITY_LEGEND.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={() => setTooltip(null)}
        onPaneClick={() => {
          select(null);
          setMenu(null);
        }}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#ffffff10" />
        <Controls
          showInteractive={false}
          className="!border-border !bg-card [&_button]:!border-border [&_button]:!bg-card [&_button]:!fill-foreground"
          position="bottom-left"
        />
        {nodes.length > 25 && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            style={{ width: 140, height: 90 }}
            className="!border !border-border !bg-card"
            nodeColor={(n) => (n.data as PactNodeData).color ?? "#8B919A"}
            maskColor="#0b0c0fcc"
          />
        )}
      </ReactFlow>

      {/* tooltip */}
      {tooltip && (
        <div
          className="glass pointer-events-none fixed z-50 max-w-[260px] rounded-md px-2.5 py-1.5"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor:
                  ENTITY_LEGEND.find(
                    ([l]) => l.toLowerCase() === tooltip.kind,
                  )?.[1] ?? "#8B919A",
              }}
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {tooltip.kind}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-foreground">{tooltip.title}</p>
          {tooltip.meta && (
            <p className="font-mono text-[9px] text-muted-foreground">{tooltip.meta}</p>
          )}
        </div>
      )}

      {/* context menu */}
      {menu && menuNode && (
        <div
          className="glass fixed z-50 w-44 rounded-md p-1"
          style={{ left: menu.x, top: menu.y }}
        >
          {menuNode.kind === "policy" && (
            <>
              {expanded.has(menu.nodeId) ? (
                <MenuItem onClick={() => { collapseNode(menu.nodeId); setMenu(null); }}>
                  Collapse neighbours
                </MenuItem>
              ) : (
                <MenuItem onClick={() => { expandNode(menu.nodeId); setMenu(null); }}>
                  Expand neighbours
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  const n = positionedById.get(menu.nodeId);
                  if (n) setCenter(n.x + 95, n.y + 30, { zoom: 1.4, duration: 500 });
                  setMenu(null);
                }}
              >
                Focus
              </MenuItem>
              <MenuItem
                onClick={() => {
                  toggleCompare(menu.nodeId);
                  setMenu(null);
                }}
              >
                Add to compare
              </MenuItem>
            </>
          )}
          {menuNode.kind === "jurisdiction" && (
            <MenuItem
              onClick={() => {
                focusCountry(menuNode.meta.country_code as never);
                setMenu(null);
              }}
            >
              Focus jurisdiction
            </MenuItem>
          )}
          {menuNode.kind !== "policy" && menuNode.kind !== "jurisdiction" && (
            <MenuItem
              onClick={() => {
                select({ kind: menuNode.kind as never, id: menu.nodeId });
                setMenu(null);
              }}
            >
              Select
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "block w-full rounded px-2 py-1 text-left text-[11px] text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
