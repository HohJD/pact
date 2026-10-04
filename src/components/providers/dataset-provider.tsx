"use client";

import { MotionConfig } from "framer-motion";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Dataset } from "@/lib/domain/schema";
import { SeedRepository } from "@/lib/data/seed-repository";
import { useWorkspace } from "@/store/workspace";

const DatasetContext = createContext<Dataset | null>(null);

export function DatasetProvider({
  dataset,
  children,
}: {
  dataset: Dataset;
  children: ReactNode;
}) {
  // CANDIDATE evidence accepted via "Add to workspace" merges in client-side so
  // it appears everywhere (graph, drawer, panels) without a page reload
  const candidates = useWorkspace((s) => s.candidateEvidence);
  const merged = useMemo(() => {
    const extra = candidates.filter(
      (e) => !dataset.evidence.some((x) => x.id === e.id),
    );
    if (!extra.length) return dataset;
    return { ...dataset, evidence: [...dataset.evidence, ...extra] };
  }, [dataset, candidates]);
  return (
    <DatasetContext.Provider value={merged}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </DatasetContext.Provider>
  );
}

export function useDataset(): Dataset {
  const ds = useContext(DatasetContext);
  if (!ds) throw new Error("useDataset must be used inside DatasetProvider");
  return ds;
}

export function useRepo(): SeedRepository {
  const ds = useDataset();
  return useMemo(() => new SeedRepository(ds), [ds]);
}

export function usePolicy(id: string | undefined) {
  const ds = useDataset();
  return useMemo(
    () => (id ? ds.policies.find((p) => p.id === id) : undefined),
    [ds, id],
  );
}

export function useEvidenceStrength(id: string | undefined) {
  const repo = useRepo();
  return useMemo(() => (id ? repo.getEvidenceStrength(id) : undefined), [repo, id]);
}
