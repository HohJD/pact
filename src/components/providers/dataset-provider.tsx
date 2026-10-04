"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Dataset } from "@/lib/domain/schema";
import { SeedRepository } from "@/lib/data/seed-repository";

const DatasetContext = createContext<Dataset | null>(null);

export function DatasetProvider({
  dataset,
  children,
}: {
  dataset: Dataset;
  children: ReactNode;
}) {
  return <DatasetContext.Provider value={dataset}>{children}</DatasetContext.Provider>;
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
