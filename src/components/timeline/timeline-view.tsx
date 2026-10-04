"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";

import {
  useDataset,
  useRepo,
} from "@/components/providers/dataset-provider";
import { policiesInView } from "@/lib/map/map-data";
import {
  firstYearOf,
  lastYearOf,
  layoutLanes,
  NOW_YEAR,
  TIMELINE_END,
  TIMELINE_START,
} from "@/lib/timeline/layout";
import type { Policy } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const BLUE = "#4C8DFF";
const ORANGE = "#FF9A3D";
const YELLOW = "#F2C94C";
const GREEN = "#3DDC97";

const LABEL_W = 150;
const ROW_H = 24;
const HEADER_H = 24;

export function TimelineView() {
  const dataset = useDataset();
  const repo = useRepo();
  const filters = useWorkspace((s) => s.filters);
  const selection = useWorkspace((s) => s.selection);
  const highlighted = useWorkspace((s) => s.highlighted);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const openEvidence = useWorkspace((s) => s.openEvidence);

  const policies = useMemo(
    () => policiesInView(dataset, filters),
    [dataset, filters],
  );
  const lanes = useMemo(
    () => layoutLanes(policies, dataset.jurisdictions),
    [policies, dataset],
  );
  const selectedPolicy =
    selection?.kind === "policy"
      ? dataset.policies.find((p) => p.id === selection.id)
      : null;

  const [tip, setTip] = useState<{
    x: number;
    y: number;
    policy: Policy;
    extra?: string;
  } | null>(null);

  // measure the lane area so the full 2005–2026 range always fits
  const containerRef = useRef<HTMLDivElement>(null);
  const [axisW, setAxisW] = useState(1000);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setAxisW(Math.max(400, el.clientWidth - LABEL_W - 40));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const x = (year: number) =>
    ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * axisW;

  const showTip = (e: React.MouseEvent, policy: Policy, extra?: string) =>
    setTip({ x: e.clientX + 14, y: e.clientY + 14, policy, extra });

  if (lanes.length === 0)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="surface px-6 py-4 text-dense text-muted-foreground">
          No policies match the current filters.
        </div>
      </div>
    );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto scrollbar-thin">
      <div style={{ width: LABEL_W + axisW + 40 }} className="relative">
        {/* sticky year axis */}
        <div className="sticky top-0 z-20 flex h-7 items-end border-b border-border bg-[#0B0C0F]/95 backdrop-blur">
          <div style={{ width: LABEL_W }} />
          <div className="relative" style={{ width: axisW }}>
            {Array.from(
              { length: TIMELINE_END - TIMELINE_START + 1 },
              (_, i) => TIMELINE_START + i,
            ).map((y) => (
              <span key={y}>
                <span
                  className="absolute bottom-0 border-l border-border/60"
                  style={{ left: x(y), height: 5 }}
                />
                {y % 2 === 0 && (
                  <span
                    className="absolute bottom-1.5 -translate-x-1/2 font-mono text-[8px] text-muted-foreground"
                    style={{ left: x(y) }}
                  >
                    {y}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* today line */}
          <div
            className="absolute top-0 z-10 w-px bg-entity-evidence/50"
            style={{ left: LABEL_W + x(NOW_YEAR), height: "100%" }}
          >
            <span className="absolute -left-7 top-1 font-mono text-[7.5px] text-entity-evidence/70">
              now
            </span>
          </div>

          {lanes.map((lane) => (
            <div key={lane.code} className="border-b border-border/40">
              {/* country header */}
              <div
                className="flex items-center gap-1.5 px-2 text-entity-jurisdiction"
                style={{ height: HEADER_H }}
              >
                <span className="font-mono text-[10px] font-semibold">{lane.code}</span>
                <span className="text-[10px]">{lane.name}</span>
                <span className="font-mono text-[8px] text-muted-foreground">
                  {lane.rows.length}
                </span>
              </div>
              {lane.rows.map((p, i) => {
                const start = firstYearOf(p.introduced) ?? TIMELINE_START;
                const end = p.ended ? (lastYearOf(p.ended) ?? start + 1) : NOW_YEAR;
                const bx = x(Math.max(start, TIMELINE_START));
                const bw = Math.max(6, x(Math.min(end, TIMELINE_END)) - bx);
                const isSelected = selectedPolicy?.id === p.id;
                const glow = highlighted.has(p.id) || isSelected;
                const dim = highlighted.size > 0 && !glow;

                const faded =
                  p.status === "CLOSED" || p.status === "SUPERSEDED";
                const barStyle: React.CSSProperties = faded
                  ? { backgroundColor: `${BLUE}73`, opacity: 0.45 }
                  : p.status === "ANNOUNCED"
                    ? {
                        border: `1px dashed ${BLUE}`,
                        backgroundColor: `${BLUE}1f`,
                      }
                    : p.status === "PAUSED"
                      ? {
                          background: `repeating-linear-gradient(45deg, ${BLUE}50, ${BLUE}50 3px, transparent 3px, transparent 7px)`,
                        }
                      : { backgroundColor: `${BLUE}b3` };

                // evidence diamonds + outcome dots for the selected policy
                const markers = isSelected
                  ? {
                      evidence: repo.getEvidenceForPolicy(p.id),
                      outcomes: repo.getOutcomesForPolicy(p.id),
                    }
                  : null;

                return (
                  <div
                    key={p.id}
                    className="relative flex items-center"
                    style={{ height: ROW_H }}
                  >
                    <div
                      className="shrink-0 truncate px-2 font-mono text-[9px] text-muted-foreground"
                      style={{ width: LABEL_W }}
                    >
                      {p.short_name ?? p.name}
                    </div>
                    <div className="relative flex-1" style={{ height: "100%" }}>
                      <motion.button
                        type="button"
                        initial={{ width: 0 }}
                        animate={{ width: bw }}
                        transition={{
                          delay: i * 0.015,
                          duration: 0.35,
                          ease: "easeOut",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          select({ kind: "policy", id: p.id });
                          openPanel("DETAILS");
                        }}
                        onMouseMove={(e) => showTip(e, p)}
                        onMouseLeave={() => setTip(null)}
                        className={cn(
                          "absolute top-1/2 h-3.5 -translate-y-1/2 cursor-pointer overflow-hidden rounded-sm text-left",
                          dim && "opacity-40",
                          glow &&
                            "ring-1 ring-entity-policy shadow-[0_0_10px_rgba(76,141,255,0.35)]",
                        )}
                        style={{ left: bx, ...barStyle }}
                      >
                        <span
                          className="absolute left-0 top-0 h-full w-[3px]"
                          style={{ backgroundColor: ORANGE }}
                        />
                        {bw > 90 && (
                          <span className="block truncate pl-2 pr-1 text-[9px] leading-[14px] text-white/90">
                            {p.short_name ?? p.name}
                          </span>
                        )}
                      </motion.button>

                      {/* narrow bars: label sits outside the bar so it isn't clipped */}
                      {bw <= 90 &&
                        (bx >= 124 ? (
                          <span
                            className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate pr-1 text-right text-[9px] leading-[14px] text-muted-foreground"
                            style={{ left: bx - 124, width: 120 }}
                          >
                            {p.short_name ?? p.name}
                          </span>
                        ) : (
                          <span
                            className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate pl-1 text-[9px] leading-[14px] text-muted-foreground"
                            style={{ left: bx + bw + 4, width: 120 }}
                          >
                            {p.short_name ?? p.name}
                          </span>
                        ))}

                      {markers?.evidence.map((ev) => {
                        const y = firstYearOf(ev.publication_date);
                        if (!y) return null;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            title={`${ev.title} (${ev.publication_date})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEvidence(ev.id);
                            }}
                            onMouseMove={(e) =>
                              showTip(e, p, `${ev.title} · ${ev.publication_date}`)
                            }
                            onMouseLeave={() => setTip(null)}
                            className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45"
                            style={{
                              left: x(y),
                              backgroundColor: YELLOW,
                              opacity: ev.data_status === "DEMO" ? 0.4 : 0.9,
                            }}
                          />
                        );
                      })}
                      {markers?.outcomes.map((o) => {
                        const y = lastYearOf(o.period);
                        if (!y) return null;
                        return (
                          <span
                            key={o.id}
                            title={o.headline}
                            className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{ left: x(y), backgroundColor: GREEN }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* tooltip */}
      {tip && (
        <div
          className="glass pointer-events-none fixed z-50 w-64 rounded-md p-2.5"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-[11px] font-medium leading-tight text-foreground">
            {tip.policy.name}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
            {tip.policy.status} · {tip.policy.introduced}
            {tip.policy.ended ? `–${tip.policy.ended}` : ""}
          </p>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            {tip.policy.mechanism_ids
              .map((m) => dataset.mechanisms.find((mm) => mm.id === m)?.name ?? m)
              .join(" · ")}
          </p>
          <p className="mt-1 font-mono text-[8px] text-entity-evidence">
            evidence: {repo.getEvidenceStrength(tip.policy.id).label}
          </p>
          {tip.extra && (
            <p className="mt-1 border-t border-border/50 pt-1 text-[9.5px] text-foreground">
              {tip.extra}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
