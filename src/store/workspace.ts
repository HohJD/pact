"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AnalystResponse, CountryCode } from "@/lib/domain/schema";
import type { PolicyFilter } from "@/lib/data/repository";
import type { TransferAssessment } from "@/lib/ai/transfer-fallback";

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
  | "ANALYST"
  | null;

export interface TransferRequest {
  target_jurisdiction_id: string;
  source_policy_ids?: string[];
  source_country?: CountryCode;
  question?: string;
}

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
  evidenceDrawerId: string | null;
  analystResponse: { data: AnalystResponse; model?: string; offline?: boolean } | null;
  analystPending: boolean;
  transferRequest: TransferRequest | null;
  transferResult: TransferAssessment | null;
  transferPending: boolean;
  paletteOpen: boolean;
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
  openEvidence: (id: string) => void;
  closeEvidence: () => void;
  setAnalyst: (r: { data: AnalystResponse; model?: string; offline?: boolean } | null) => void;
  setAnalystPending: (b: boolean) => void;
  openTransfer: (req: TransferRequest) => void;
  closeTransfer: () => void;
  setTransferResult: (r: TransferAssessment | null) => void;
  setTransferPending: (b: boolean) => void;
  setPaletteOpen: (b: boolean) => void;
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
      evidenceDrawerId: null,
      analystResponse: null,
      analystPending: false,
      transferRequest: null,
      transferResult: null,
      transferPending: false,
      paletteOpen: false,
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
      openEvidence: (evidenceDrawerId) => set({ evidenceDrawerId }),
      closeEvidence: () => set({ evidenceDrawerId: null }),
      setAnalyst: (analystResponse) => set({ analystResponse }),
      setAnalystPending: (analystPending) => set({ analystPending }),
      openTransfer: (transferRequest) =>
        set({ transferRequest, transferResult: null }),
      closeTransfer: () =>
        set({ transferRequest: null, transferResult: null, transferPending: false }),
      setTransferResult: (transferResult) => set({ transferResult }),
      setTransferPending: (transferPending) => set({ transferPending }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
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
          analystResponse: null,
          analystPending: false,
          transferRequest: null,
          transferResult: null,
          transferPending: false,
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
