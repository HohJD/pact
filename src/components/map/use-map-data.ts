"use client";

import { useMemo } from "react";

import { useDataset } from "@/components/providers/dataset-provider";
import { computeMapData, type MapData } from "@/lib/map/map-data";
import { useWorkspace } from "@/store/workspace";

export function useMapData(): MapData {
  const dataset = useDataset();
  const filters = useWorkspace((s) => s.filters);
  return useMemo(() => computeMapData(dataset, filters), [dataset, filters]);
}
