"use client";

import { useEffect, useRef } from "react";

import { forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";

import { seedDataset } from "@/data/seed";
import { ENTITY_COLORS } from "@/lib/theme/entity";

type Node = {
  id: string;
  kind: keyof typeof ENTITY_COLORS;
  x: number;
  y: number;
  drift: number; // phase offset for idle motion
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
 * Live preview of the policy network: ~60 real seed entities on a d3-force
 * layout computed once, then an idle drift + slow rotation on a canvas.
 */
export function NetworkPreview() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = mulberry32(20240);
    const nodes: Node[] = [
      ...seedDataset.policies.slice(0, 44).map((p) => ({
        id: p.id,
        kind: "policy" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
      })),
      ...seedDataset.jurisdictions.map((j) => ({
        id: j.id,
        kind: "jurisdiction" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
      })),
      ...seedDataset.technologies.map((t) => ({
        id: t.id,
        kind: "technology" as const,
        x: 0,
        y: 0,
        drift: rand() * Math.PI * 2,
      })),
    ];
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const edges: Edge[] = [];
    const included = new Set(nodes.map((n) => n.id));
    for (const p of seedDataset.policies.slice(0, 44)) {
      for (const ref of [p.jurisdiction_id, p.technology_ids[0]]) {
        if (ref && included.has(ref))
          edges.push({
            a: index.get(p.id)!,
            b: index.get(ref)!,
            similar: false,
            pulse: 0,
          });
      }
    }
    for (const s of seedDataset.similarities) {
      if (included.has(s.policy_a) && included.has(s.policy_b))
        edges.push({
          a: index.get(s.policy_a)!,
          b: index.get(s.policy_b)!,
          similar: true,
          pulse: 0,
        });
    }

    // one-time deterministic layout
    const simNodes = nodes.map((n, i) => ({
      ...n,
      x: Math.cos(i) * 200 + rand() * 60,
      y: Math.sin(i) * 200 + rand() * 60,
    }));
    forceSimulation(simNodes)
      .force(
        "link",
        forceLink(
          edges.map((e) => ({ source: e.a, target: e.b })),
        ).distance(60),
      )
      .force("charge", forceManyBody().strength(-50))
      .force("collide", forceCollide(16))
      .stop()
      .tick(160);
    simNodes.forEach((n, i) => {
      nodes[i].x = n.x;
      nodes[i].y = n.y;
    });

    // fit into canvas
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

    const draw = (t: number) => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const scale =
        Math.min(w / (bounds.x1 - bounds.x0 + 120), h / (bounds.y1 - bounds.y0 + 120)) * 0.9;
      const rot = Math.sin(t / 24000) * 0.04; // gentle idle sway
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const cx = (bounds.x0 + bounds.x1) / 2;
      const cy = (bounds.y0 + bounds.y1) / 2;
      const px = (x: number, y: number, drift: number): [number, number] => {
        const dx = x - cx + Math.sin(t / 3800 + drift) * 5;
        const dy = y - cy + Math.cos(t / 4400 + drift) * 5;
        return [w / 2 + (dx * cosR - dy * sinR) * scale, h / 2 + (dx * sinR + dy * cosR) * scale];
      };

      // occasionally ignite a SIMILAR_TO edge pulse
      pulseTimer -= 1;
      if (pulseTimer <= 0 && simEdges.length) {
        simEdges[Math.floor(rand() * simEdges.length)].pulse = 1;
        pulseTimer = 90 + rand() * 120;
      }

      const pos = nodes.map((n) => px(n.x, n.y, n.drift));
      for (const e of edges) {
        const [x1, y1] = pos[e.a];
        const [x2, y2] = pos[e.b];
        ctx.strokeStyle = e.similar
          ? "rgba(155,123,255,0.28)"
          : "rgba(139,145,154,0.16)";
        ctx.lineWidth = e.similar ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (e.pulse > 0) {
          const p = 1 - e.pulse;
          const px2 = x1 + (x2 - x1) * p;
          const py2 = y1 + (y2 - y1) * p;
          ctx.fillStyle = `rgba(155,123,255,${e.pulse * 0.9})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          e.pulse = Math.max(0, e.pulse - 0.02);
        }
      }
      nodes.forEach((n, i) => {
        const [x, y] = pos[i];
        ctx.fillStyle = ENTITY_COLORS[n.kind];
        ctx.globalAlpha = n.kind === "policy" ? 0.9 : 0.75;
        ctx.beginPath();
        ctx.arc(x, y, n.kind === "policy" ? 3.5 : 5, 0, Math.PI * 2);
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
    />
  );
}
