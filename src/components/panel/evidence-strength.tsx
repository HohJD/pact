"use client";

import type { EvidenceStrength } from "@/lib/data/repository";
import { cn } from "@/lib/utils";

const LABEL_COLOR: Record<string, string> = {
  Strong: "#3DDC97",
  Moderate: "#F2C94C",
  Limited: "#FF9A3D",
  Insufficient: "#8B919A",
};

export function EvidenceStrengthDots({
  strength,
  showSummary = true,
}: {
  strength: EvidenceStrength;
  showSummary?: boolean;
}) {
  const color = LABEL_COLOR[strength.label] ?? "#8B919A";
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full"
              style={{ backgroundColor: i <= strength.score ? color : "#3a3d44" }}
            />
          ))}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
          {strength.label}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          {strength.counts.evaluates}E·{strength.counts.monitors}M·{strength.counts.context}C
        </span>
      </div>
      {showSummary && strength.summary.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {strength.summary.slice(0, 4).map((s, i) => (
            <li key={i} className={cn("text-[10px] text-muted-foreground")}>
              · {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
