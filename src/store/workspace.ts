"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CountryCode } from "@/lib/domain/schema";
import type { PolicyFilter } from "@/lib/data/repository";

export type WorkspaceView = "GRAPH" | "MAP" | "TIMELINE" | "OUTCOMES";

export type SelectionKind =
  | "policy"
  | "jurisdiction"
  | "mechanism"
  | "technology"
  | "evidence"
  | "outcome"
  | "edge";

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export type PanelKind =
  | "DETAILS"
  | "EVIDENCE"
  | "OUTCOMES"
  | "COMPARE"
  | "SIMILARITY"
  | null;

export interface WorkspaceFilter extends PolicyFilter {
  evidence_strength_min?: number; // 0–5
}

export interface SavedSearch {
  q: string;
  at: number;
}

interface WorkspaceState {
  query: string;
  view: WorkspaceView;
  filters: WorkspaceFilter;
  selection: Selection | null;
  panel: PanelKind;
  highlighted: Set<string>;
  compareIds: string[];
  expanded: Set<string>;
  focusedCountry: CountryCode | null;
  savedSearches: SavedSearch[];

  setQuery: (q: string) => void;
  setView: (v: WorkspaceView) => void;
  setFilters: (f: WorkspaceFilter) => void;
  patchFilters: (f: Partial<WorkspaceFilter>) => void;
  clearFilters: () => void;
  select: (sel: Selection | null) => void;
  openPanel: (p: PanelKind) => void;
  toggleCompare: (policyId: string) => void;
  expandNode: (policyId: string) => void;
  collapseNode: (policyId: string) => void;
  focusCountry: (c: CountryCode | null) => void;
  highlight: (ids: string[]) => void;
  clearHighlights: () => void;
  saveCurrentSearch: () => void;
  removeSavedSearch: (at: number) => void;
  reset: () => void;
}

const EMPTY_FILTERS: WorkspaceFilter = {};

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      query: "",
      view: "GRAPH",
      filters: EMPTY_FILTERS,
      selection: null,
      panel: null,
      highlighted: new Set<string>(),
      compareIds: [],
      expanded: new Set<string>(),
      focusedCountry: null,
      savedSearches: [],

      setQuery: (query) => set({ query }),
      setView: (view) => set({ view }),
      setFilters: (filters) => set({ filters }),
      patchFilters: (f) => set({ filters: { ...get().filters, ...f } }),
      clearFilters: () => set({ filters: EMPTY_FILTERS }),
      select: (selection) => set({ selection }),
      openPanel: (panel) => set({ panel }),
      toggleCompare: (policyId) =>
        set((s) => ({
          compareIds: s.compareIds.includes(policyId)
            ? s.compareIds.filter((id) => id !== policyId)
            : s.compareIds.length < 4
              ? [...s.compareIds, policyId]
              : s.compareIds,
        })),
      expandNode: (policyId) =>
        set((s) => ({ expanded: new Set(s.expanded).add(policyId) })),
      collapseNode: (policyId) =>
        set((s) => {
          const next = new Set(s.expanded);
          next.delete(policyId);
          return { expanded: next };
        }),
      focusCountry: (focusedCountry) => set({ focusedCountry }),
      highlight: (ids) => set({ highlighted: new Set(ids) }),
      clearHighlights: () => set({ highlighted: new Set() }),
      saveCurrentSearch: () =>
        set((s) =>
          s.query.trim()
            ? {
                savedSearches: [
                  { q: s.query.trim(), at: Date.now() },
                  ...s.savedSearches.filter((x) => x.q !== s.query.trim()),
                ].slice(0, 20),
              }
            : s,
        ),
      removeSavedSearch: (at) =>
        set((s) => ({ savedSearches: s.savedSearches.filter((x) => x.at !== at) })),
      reset: () =>
        set({
          query: "",
          filters: EMPTY_FILTERS,
          selection: null,
          panel: null,
          highlighted: new Set(),
          compareIds: [],
          expanded: new Set(),
          focusedCountry: null,
        }),
    }),
    {
      name: "pact-workspace",
      partialize: (s) => ({ savedSearches: s.savedSearches }),
      storage: createJSONStorage(() => window.localStorage),
      skipHydration: typeof window === "undefined",
    },
  ),
);
