import { useSyncExternalStore } from "react";

import {
  DEFAULT_SIMILARITY_WEIGHTS,
  type SimilarityWeights,
} from "./structured";

export const SIMILARITY_PREFS_KEY = "pact.similarityWeights";
export const DEFAULT_THRESHOLD = 65;

export interface SimilarityPrefs {
  weights: SimilarityWeights;
  threshold: number; // 0–100
}

export const DEFAULT_PREFS: SimilarityPrefs = {
  weights: DEFAULT_SIMILARITY_WEIGHTS,
  threshold: DEFAULT_THRESHOLD,
};

let cachedRaw: string | null | undefined;
let cachedPrefs: SimilarityPrefs = DEFAULT_PREFS;

export function loadSimilarityPrefs(): SimilarityPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(SIMILARITY_PREFS_KEY);
    if (raw === cachedRaw) return cachedPrefs;
    cachedRaw = raw;
    if (!raw) return (cachedPrefs = DEFAULT_PREFS);
    const parsed = JSON.parse(raw) as Partial<SimilarityPrefs>;
    cachedPrefs = {
      weights: { ...DEFAULT_SIMILARITY_WEIGHTS, ...parsed.weights },
      threshold:
        typeof parsed.threshold === "number"
          ? Math.min(100, Math.max(0, parsed.threshold))
          : DEFAULT_THRESHOLD,
    };
    return cachedPrefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

const PREFS_EVENT = "pact:similarity-prefs";

export function storeSimilarityPrefs(prefs: SimilarityPrefs): void {
  try {
    window.localStorage.setItem(SIMILARITY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — prefs are session-only
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/** Live similarity prefs — reads localStorage, re-renders on Apply. */
export function useSimilarityPrefs(): SimilarityPrefs {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(PREFS_EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(PREFS_EVENT, cb);
      };
    },
    loadSimilarityPrefs,
    () => DEFAULT_PREFS,
  );
}
