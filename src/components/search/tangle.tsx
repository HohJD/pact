"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
} from "d3-force";
import { scaleLinear } from "d3-scale";

import { Flag } from "@/components/flag";
import { ENTITY_COLORS } from "@/lib/theme/entity";

export interface TangleNode {
  id: string;
  title: string;
  short_name?: string | null;
  country_code: string | null;
  country_name?: string | null;
  year?: string | null;
  status?: string | null;
  imported?: boolean;
  score: number; // 0–1 relevance
}

export interface TangleLink {
  source: string;
  target: string;
  score: number; // 0–1 similarity
}

interface SimNode extends TangleNode {
  x: number;
  y: number;
  r: number;
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  score: number;
}

const WIDTH = 760;
const HEIGHT = 760;

interface Tip {
  x: number;
  y: number;
  title: string;
  flag?: string | null;
  lines: string[];
}

export function Tangle({
  nodes,
  links,
  selectedId,
  hoveredId,
  onSelect,
  onLinkClick,
}: {
  nodes: TangleNode[];
  links: TangleLink[];
  selectedId: string | null;
  hoveredId?: string | null;
  onSelect: (id: string | null) => void;
  onLinkClick: (a: string, b: string) => void;
}) {
  const [placed, setPlaced] = useState<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const [tip, setTip] = useState<Tip | null>(null);
  const [hotLink, setHotLink] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const radius = useMemo(() => {
    const scores = nodes.map((n) => n.score);
    const lo = Math.min(...scores, 0);
    const hi = Math.max(...scores, 1);
    return scaleLinear().domain([lo, hi]).range([6, 22]).clamp(true);
  }, [nodes]);

  const linkScale = useMemo(() => {
    const scores = links.map((l) => l.score);
    const lo = Math.min(...scores, 0);
    const hi = Math.max(...scores, 1);
    return {
      width: scaleLinear().domain([lo, hi]).range([1, 6]).clamp(true),
      color: scaleLinear().domain([lo, hi]).range([0, 1]).clamp(true),
    };
  }, [links]);

  // run the force layout live — nodes drift into place like diagram.js did;
  // positions are pushed to state at most once per animation frame
  useEffect(() => {
    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: WIDTH / 2 + (Math.random() - 0.5) * 40,
      y: HEIGHT / 2 + (Math.random() - 0.5) * 40,
      r: radius(n.score),
    }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = links
      .filter((l) => byId.has(l.source) && byId.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, score: l.score }));

    let flushQueued = false;
    const sim = forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.05)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => 160 - 100 * l.score)
          .strength(0.6),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("x", forceX(WIDTH / 2).strength(0.06))
      .force("y", forceY(HEIGHT / 2).strength(0.06))
      .force(
        "collide",
        forceCollide<SimNode>((d) => d.r + 4),
      )
      .on("tick", () => {
        // clamp into bounds (like diagram.js did per-tick)
        for (const n of simNodes) {
          n.x = Math.max(n.r + 4, Math.min(WIDTH - n.r - 4, n.x));
          n.y = Math.max(n.r + 4, Math.min(HEIGHT - n.r - 4, n.y));
        }
        if (flushQueued) return;
        flushQueued = true;
        window.requestAnimationFrame(() => {
          flushQueued = false;
          setPlaced(
            new Map(simNodes.map((n) => [n.id, { x: n.x, y: n.y }])),
          );
        });
      });
    return () => {
      flushQueued = true;
      sim.stop();
    };
  }, [nodes, links, radius]);

  const neighbourIds = useMemo(() => {
    if (!selectedId) return null;
    const s = new Set<string>([selectedId]);
    for (const l of links)
      if (l.source === selectedId) s.add(l.target);
      else if (l.target === selectedId) s.add(l.source);
    return s;
  }, [links, selectedId]);

  const hotEndpoints = useMemo(() => {
    const s = new Set<string>();
    if (!hotLink) return s;
    const l = links.find(
      (x) => [x.source, x.target].sort().join("|") === hotLink,
    );
    if (l) s.add(l.source).add(l.target);
    return s;
  }, [links, hotLink]);

  const showTip = (
    e: React.MouseEvent,
    title: string,
    lines: string[],
    flag?: string | null,
  ) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    setTip({
      x: e.clientX - (rect?.left ?? 0) + 12,
      y: e.clientY - (rect?.top ?? 0) + 12,
      title,
      flag,
      lines,
    });
  };

  const nodeTitle = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.title]));
    return (id: string) => m.get(id) ?? id;
  }, [nodes]);

  // link colour: grey → policy blue by similarity score
  const simColor = (score: number, selected: boolean) => {
    const pct = Math.round(linkScale.color(score) * 100);
    return selected
      ? `color-mix(in srgb, ${ENTITY_COLORS.policy} 100%, #9aa3af)`
      : `color-mix(in srgb, ${ENTITY_COLORS.policy} ${pct}%, #9aa3af)`;
  };

  return (
    <div ref={wrapRef} className="relative max-w-[760px]">
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Policy similarity tangle"
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
      >
        {links.map((l) => {
          const a = placed.get(l.source);
          const b = placed.get(l.target);
          if (!a || !b) return null;
          const touchesSel =
            !!selectedId && (l.source === selectedId || l.target === selectedId);
          const faded = !!selectedId && !touchesSel;
          const key = [l.source, l.target].sort().join("|");
          return (
            <g key={key}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={simColor(l.score, touchesSel)}
                strokeWidth={linkScale.width(l.score)}
                strokeOpacity={faded ? 0.08 : 1}
                pointerEvents="none"
                style={{ transition: "stroke-opacity .15s" }}
              />
              {/* fat invisible hit-area — nodes can sit on a link's midpoint */}
              <line
                data-link={key}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={Math.max(10, linkScale.width(l.score))}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkClick(l.source, l.target);
                }}
                onMouseMove={(e) => {
                  setHotLink(key);
                  showTip(e, "Similarity", [
                    `${nodeTitle(l.source)} ↔ ${nodeTitle(l.target)} · ${Math.round(l.score * 100)} / 100`,
                  ]);
                }}
                onMouseLeave={() => {
                  setTip(null);
                  setHotLink(null);
                }}
              />
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = placed.get(n.id);
          if (!p) return null;
          const faded = !!neighbourIds && !neighbourIds.has(n.id);
          const isSel = n.id === selectedId;
          const isHot = n.id === hoveredId || hotEndpoints.has(n.id);
          return (
            <circle
              key={n.id}
              cx={p.x}
              cy={p.y}
              r={radius(n.score)}
              fill={isSel ? "#08316D" : ENTITY_COLORS.policy}
              fillOpacity={faded ? 0.25 : isSel || isHot ? 1 : 0.75}
              stroke={isSel ? "#08316D" : isHot ? ENTITY_COLORS.policy : "var(--background)"}
              strokeWidth={isSel || isHot ? 2.5 : 1.5}
              strokeDasharray={n.imported ? "3 3" : undefined}
              className="cursor-pointer"
              style={{ transition: "fill-opacity .15s, stroke-opacity .15s" }}
              data-node={n.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSel ? null : n.id);
              }}
              onMouseMove={(e) =>
                showTip(
                  e,
                  n.title,
                  [
                    n.short_name ?? "",
                    `${n.country_name ?? n.country_code ?? ""} · ${n.year ?? ""}`,
                    n.status ?? "",
                    `relevance ${Math.round(n.score * 100)} / 100`,
                  ],
                  n.country_code,
                )
              }
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[240px] rounded border border-border bg-card px-2.5 py-1.5 shadow-md"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium leading-snug">
            {tip.flag && <Flag code={tip.flag} />}
            {tip.title}
          </p>
          {tip.lines.filter(Boolean).map((l, i) => (
            <p key={i} className="text-[10px] text-muted-foreground">
              {l}
            </p>
          ))}
        </div>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        circle size = relevance · line = similarity (thicker = closer) · click a
        line to compare
      </p>
    </div>
  );
}
