"use client";

import { cn } from "@/lib/utils";

const INFERENCE_STYLE: Record<string, string> = {
  CAUSAL: "border-entity-outcome/40 bg-entity-outcome/15 text-entity-outcome",
  CORRELATIONAL: "border-entity-evidence/40 bg-entity-evidence/15 text-entity-evidence",
  DESCRIPTIVE: "border-border bg-secondary text-muted-foreground",
};

export function InferenceChip({ inference }: { inference: string }) {
  return (
    <span
      className={cn(
        "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
        INFERENCE_STYLE[inference] ?? INFERENCE_STYLE.DESCRIPTIVE,
      )}
    >
      {inference}
    </span>
  );
}
