"use client";

import { useSimilarityPrefs } from "@/lib/similarity/prefs";
import { rescoreSimilarity } from "@/lib/similarity/structured";
import type { SimilarityBreakdown } from "@/lib/domain/schema";
import type { z } from "zod";

type Breakdown = z.infer<typeof SimilarityBreakdown>;

export function CompareScore({ breakdown }: { breakdown: Breakdown }) {
  const prefs = useSimilarityPrefs();
  const score = rescoreSimilarity(breakdown, prefs.weights);

  return (
    <div className="flex flex-col items-center py-2">
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Similarity
      </span>
      <span className="text-3xl font-semibold tabular-nums">
        {Math.round(score * 100)}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        out of 100
      </span>
    </div>
  );
}
