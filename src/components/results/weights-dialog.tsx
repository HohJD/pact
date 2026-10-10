"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_PREFS,
  loadSimilarityPrefs,
  storeSimilarityPrefs,
  type SimilarityPrefs,
} from "@/lib/similarity/prefs";
import type { SimilarityWeights } from "@/lib/similarity/structured";

const FIELDS: { key: keyof SimilarityWeights; label: string }[] = [
  { key: "technology", label: "Technology" },
  { key: "mechanism", label: "Mechanism" },
  { key: "sector", label: "Sector" },
  { key: "target", label: "Target group" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "semantic", label: "Semantic" },
];

function Row({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs">{label}</span>
      <Slider
        min={0}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="w-6 text-right font-mono text-xs tabular-nums">
        {value}
      </span>
    </div>
  );
}

/** Draft state lives here — DialogContent unmounts on close, so the draft
 * re-initialises from persisted prefs each time the dialog opens. */
function WeightsForm({
  onApply,
  onClose,
}: {
  onApply: (prefs: SimilarityPrefs) => void;
  onClose: () => void;
}) {
  const [prefs, setPrefs] = useState<SimilarityPrefs>(() =>
    loadSimilarityPrefs(),
  );

  const apply = () => {
    storeSimilarityPrefs(prefs);
    onApply(prefs);
    onClose();
  };

  return (
    <>
      <div className="space-y-3 py-2">
        <Row
          label="Similarity threshold"
          value={prefs.threshold}
          max={100}
          onChange={(v) => setPrefs((p) => ({ ...p, threshold: v }))}
        />
        <p className="pt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Dimension weights (0–10)
        </p>
        {FIELDS.map((f) => (
          <Row
            key={f.key}
            label={f.label}
            value={prefs.weights[f.key]}
            max={10}
            onChange={(v) =>
              setPrefs((p) => ({
                ...p,
                weights: { ...p.weights, [f.key]: v },
              }))
            }
          />
        ))}
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPrefs(DEFAULT_PREFS)}
        >
          Reset defaults
        </Button>
        <Button size="sm" onClick={apply}>
          Apply
        </Button>
      </DialogFooter>
    </>
  );
}

export function WeightsDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (prefs: SimilarityPrefs) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Similarity weights</DialogTitle>
        </DialogHeader>
        <WeightsForm onApply={onApply} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
