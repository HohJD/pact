"use client";

import { useEffect, useRef } from "react";

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
} from "d3-force";

import { seedDataset } from "@/data/seed";
import { ENTITY_COLORS } from "@/lib/theme/entity";

type Node = {
  id: string;
  kind: keyof typeof ENTITY_COLORS;
  x: number;
  y: number;
  drift: number;
  degree: number;
};
type Edge = { a: number; b: number; similar: boolean; pulse: number };

/** Deterministic PRNG so the preview layout is stable across renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Live preview of the policy network: ~60 real seed entities on a wide,
 * one-shot d3-force layout, then idle drift on a canvas. Deterministic seed.
 */
export function NetworkPreview() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = mulberry32(20240);
    const policies = seedDataset.policies.slice(0, 44);
    const nodes: Node[] = [
      ...policies.map((p) => ({
        id: p.id,
        kind: "policy" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
        degree: 0,
      })),
      ...seedDataset.jurisdictions.map((j) => ({
        id: j.id,
        kind: "jurisdiction" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
        degree: 0,
      })),
      ...seedDataset.technologies.map((t) => ({
        id: t.id,
        kind: "technology" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
        degree: 0,
      })),
    ];
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const edges: Edge[] = [];
    const included = new Set(nodes.map((n) => n.id));
    for (const p of policies) {
      for (const ref of [p.jurisdiction_id, p.technology_ids[0]]) {
        if (ref && included.has(ref))
          edges.push({ a: index.get(p.id)!, b: index.get(ref)!, similar: false, pulse: 0 });
      }
    }
    for (const s of seedDataset.similarities) {
      if (included.has(s.policy_a) && included.has(s.policy_b))
        edges.push({ a: index.get(s.policy_a)!, b: index.get(s.policy_b)!, similar: true, pulse: 0 });
    }
    for (const e of edges) {
      nodes[e.a].degree++;
      nodes[e.b].degree++;
    }

    // one-time deterministic wide layout — 400 ticks before first paint
    const simNodes = nodes.map((n) => ({
      ...n,
      x: (rand() - 0.5) * 1400,
      y: (rand() - 0.5) * 500,
    }));
    type SimNode = (typeof simNodes)[number];
    interface SimLink extends SimulationLinkDatum<SimNode> {
      similar: boolean;
    }
    forceSimulation(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(
          edges.map((e) => ({ source: e.a, target: e.b, similar: e.similar })),
        )
          .distance((l) => (l.similar ? 110 : 70))
          .strength(0.4),
      )
      .force("charge", forceManyBody().strength(-180))
      .force("collide", forceCollide(14))
      .force("x", forceX(0).strength(0.05))
      .force("y", forceY(0).strength(0.08))
      .stop()
      .tick(400);
    simNodes.forEach((n, i) => {
      nodes[i].x = n.x;
      nodes[i].y = n.y;
    });

    const xs = simNodes.map((n) => n.x);
    const ys = simNodes.map((n) => n.y);
    const bounds = {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
    };

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let pulseTimer = 0;
    const simEdges = edges.filter((e) => e.similar);
    const kindAlpha: Record<string, number> = { policy: 0.9, jurisdiction: 0.75, technology: 0.75 };

    const draw = (t: number) => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // panorama fit — fill the width, compress the vertical span
      const sx = (w - 60) / (bounds.x1 - bounds.x0 || 1);
      const sy = (h - 60) / (bounds.y1 - bounds.y0 || 1);
      const cx = (bounds.x0 + bounds.x1) / 2;
      const cy = (bounds.y0 + bounds.y1) / 2;
      const px = (n: Node): [number, number] => [
        w / 2 + (n.x - cx + Math.sin(t / 3800 + n.drift) * 4) * sx,
        h / 2 + (n.y - cy + Math.cos(t / 4400 + n.drift) * 4) * sy,
      ];

      pulseTimer -= 1;
      if (pulseTimer <= 0 && simEdges.length) {
        simEdges[Math.floor(rand() * simEdges.length)].pulse = 1;
        pulseTimer = 90 + rand() * 120;
      }

      const pos = nodes.map(px);
      for (const e of edges) {
        const [x1, y1] = pos[e.a];
        const [x2, y2] = pos[e.b];
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = ENTITY_COLORS[nodes[e.a].kind];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (e.pulse > 0) {
          const p = 1 - e.pulse;
          ctx.globalAlpha = e.pulse * 0.9;
          ctx.fillStyle = ENTITY_COLORS.jurisdiction;
          ctx.beginPath();
          ctx.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 2.5, 0, Math.PI * 2);
          ctx.fill();
          e.pulse = Math.max(0, e.pulse - 0.02);
        }
      }
      ctx.globalAlpha = 1;
      nodes.forEach((n, i) => {
        const [x, y] = pos[i];
        ctx.fillStyle = ENTITY_COLORS[n.kind];
        ctx.globalAlpha = kindAlpha[n.kind] ?? 0.8;
        ctx.beginPath();
        ctx.arc(x, y, Math.min(7, 3 + n.degree * 0.8), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const start = () => (raf = requestAnimationFrame(draw));
    const stop = () => cancelAnimationFrame(raf);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none h-full w-full opacity-70 dark:opacity-80"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    />
  );
}
