"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type PactNodeData = {
  label: string;
  color: string;
  meta: Record<string, unknown>;
  dim?: boolean;
  glow?: boolean;
};

type PactFlowNode = Node<PactNodeData>;

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0 !size-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !size-1" />
    </>
  );
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#3DDC97",
  ANNOUNCED: "#4C8DFF",
  PAUSED: "#F2C94C",
  CLOSED: "#8B919A",
  SUPERSEDED: "#8B919A",
};

export function PolicyNode({ data, selected }: NodeProps<PactFlowNode>) {
  const status = String(data.meta.status ?? "");
  const demo = data.meta.data_status === "DEMO";
  // imported (CPDB) policies: dashed border, same convention as candidate evidence
  const imported = data.meta.data_status === "IMPORTED";
  // border brightness scales with evidence strength (0–5)
  const score = Math.max(0, Math.min(5, Number(data.meta.evidenceScore ?? 0)));
  const borderAlpha = Math.round(((0.25 + score * 0.15) * 255)).toString(16).padStart(2, "0");
  return (
    <div
      className={cn(
        "w-[170px] rounded-md border bg-card px-2 py-1.5 shadow-sm transition-[opacity,transform] hover:scale-[1.03]",
        data.dim && "opacity-40",
        selected && "border-entity-policy",
      )}
      style={{
        borderStyle: imported ? "dashed" : "solid",
        borderWidth: 1,
        borderTopColor: `${data.color}${borderAlpha}`,
        borderRightColor: `${data.color}${borderAlpha}`,
        borderBottomColor: `${data.color}${borderAlpha}`,
        borderLeftWidth: 3,
        borderLeftColor: data.color,
        boxShadow: data.glow ? `0 0 0 2px ${data.color}66, 0 0 18px ${data.color}44` : undefined,
      }}
    >
      <Handles />
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-[12px] font-medium leading-tight text-foreground">
          {data.label}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          {String(data.meta.country_code ?? "")}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: STATUS_COLOR[status] ?? "#8B919A" }}
        />
        <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          {status}
        </span>
        {demo && (
          <span className="rounded bg-entity-evidence/20 px-1 font-mono text-[8px] text-entity-evidence">
            DEMO
          </span>
        )}
      </div>
    </div>
  );
}

export function JurisdictionNode({ data, selected }: NodeProps<PactFlowNode>) {
  const national =
    data.meta.level === "NATIONAL" || data.meta.level === "SUPRANATIONAL";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-full border-2 bg-card text-center transition-[opacity,transform] hover:scale-[1.03]",
        national ? "size-20" : "size-14",
        data.dim && "opacity-40",
      )}
      style={{
        borderColor: data.color,
        boxShadow: data.glow ? `0 0 0 3px ${data.color}66, 0 0 20px ${data.color}44` : undefined,
        outline: selected ? `2px solid ${data.color}` : undefined,
      }}
      title={data.label}
    >
      <Handles />
      <span
        className={cn(
          "max-w-[68px] px-0.5 leading-tight text-foreground",
          national ? "text-[10px] font-medium" : "text-[9px]",
        )}
      >
        {data.label}
      </span>
      <span className="font-mono text-[8px] text-muted-foreground">
        {String(data.meta.country_code ?? "")}
      </span>
    </div>
  );
}

export function TechnologyNode({ data, selected }: NodeProps<PactFlowNode>) {
  return (
    <div
      className={cn(
        "flex h-16 w-24 items-center justify-center rounded-full border bg-card px-1 text-center transition-[opacity,transform] hover:scale-[1.03]",
        data.dim && "opacity-40",
      )}
      style={{
        borderColor: `${data.color}88`,
        boxShadow: data.glow
          ? `0 0 0 3px ${data.color}66, 0 0 24px ${data.color}55`
          : `0 0 14px ${data.color}22`,
        outline: selected ? `2px solid ${data.color}` : undefined,
      }}
    >
      <Handles />
      <span className="line-clamp-2 text-[9px] font-medium leading-tight text-foreground">
        {data.label}
      </span>
    </div>
  );
}

export function MechanismNode({ data, selected }: NodeProps<PactFlowNode>) {
  return (
    <div
      className={cn(
        "rounded-full border px-2.5 py-1 transition-[opacity,transform] hover:scale-[1.03]",
        data.dim && "opacity-40",
        selected && "ring-1",
      )}
      style={{
        borderColor: `${data.color}88`,
        backgroundColor: `${data.color}14`,
        boxShadow: data.glow ? `0 0 0 2px ${data.color}66, 0 0 14px ${data.color}44` : undefined,
      }}
    >
      <Handles />
      <span className="font-mono text-[9px] uppercase tracking-wide" style={{ color: data.color }}>
        {data.label}
      </span>
    </div>
  );
}

const STRENGTH_DOTS: Record<string, number> = {
  EXPERIMENTAL: 5,
  META_ANALYSIS: 5,
  QUASI_EXPERIMENTAL: 4,
  CORRELATIONAL: 3,
  DESCRIPTIVE: 2,
  UNKNOWN: 1,
};

export function EvidenceNode({ data, selected }: NodeProps<PactFlowNode>) {
  const dots = STRENGTH_DOTS[String(data.meta.causal_strength)] ?? 1;
  const candidate = data.meta.data_status === "CANDIDATE";
  return (
    <div
      className={cn(
        "flex w-[110px] flex-col gap-0.5 rounded border bg-card p-1.5 transition-[opacity,transform] hover:scale-[1.03]",
        candidate && "border-dashed",
        data.dim && "opacity-40",
      )}
      style={{
        borderColor: `${data.color}66`,
        boxShadow: data.glow
          ? `0 0 0 2px ${data.color}66`
          : candidate
            ? `0 0 0 2px ${data.color}33`
            : undefined,
        outline: selected ? `1.5px solid ${data.color}` : undefined,
      }}
    >
      <Handles />
      <span className="line-clamp-2 text-[8.5px] leading-tight text-foreground">
        {data.label}
      </span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="size-1 rounded-full"
            style={{ backgroundColor: i <= dots ? data.color : "#3a3d44" }}
          />
        ))}
      </span>
    </div>
  );
}

const DIRECTION_GLYPH: Record<string, string> = {
  UP: "↑",
  DOWN: "↓",
  FLAT: "→",
  MIXED: "↕",
};

export function OutcomeNode({ data, selected }: NodeProps<PactFlowNode>) {
  const direction = String(data.meta.direction ?? "FLAT");
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full border bg-card transition-[opacity,transform] hover:scale-[1.03]",
        data.dim && "opacity-40",
      )}
      style={{
        borderColor: data.color,
        boxShadow: data.glow ? `0 0 0 2px ${data.color}66` : undefined,
        outline: selected ? `2px solid ${data.color}` : undefined,
      }}
      title={data.label}
    >
      <Handles />
      <span className="text-[14px]" style={{ color: data.color }}>
        {DIRECTION_GLYPH[direction] ?? "→"}
      </span>
    </div>
  );
}

export const nodeTypes = {
  policy: PolicyNode,
  jurisdiction: JurisdictionNode,
  technology: TechnologyNode,
  mechanism: MechanismNode,
  evidence: EvidenceNode,
  outcome: OutcomeNode,
};
