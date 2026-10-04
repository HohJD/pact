import { seedDataset } from "@/data/seed";
import type { Dataset } from "@/lib/domain/schema";
import type { PactRepository } from "./repository";
import { SeedRepository } from "./seed-repository";
import { SupabaseRepository } from "./supabase-repository";
import { withRuntimeAdditions } from "./runtime";

let cached: PactRepository | null = null;
let cachedDataset: Dataset | null = null;
let supabaseWarned = false;

/** Sync repository over the in-memory dataset (seed + runtime additions). */
export function getRepository(): PactRepository {
  if (cached) return cached;
  cachedDataset = withRuntimeAdditions(seedDataset);
  cached = new SeedRepository(cachedDataset);
  return cached;
}

/**
 * Async dataset loader. When PACT_DATA_SOURCE=supabase and the env is present,
 * loads all domain tables from Supabase; any failure logs once and falls back
 * to the seed dataset so the demo never breaks.
 */
export async function loadDataset(): Promise<Dataset> {
  if (cachedDataset) return cachedDataset;
  if (process.env.PACT_DATA_SOURCE === "supabase") {
    try {
      const dataset = (await SupabaseRepository.load()).getDataset();
      cachedDataset = withRuntimeAdditions(dataset);
      cached = new SeedRepository(cachedDataset);
      return cachedDataset;
    } catch (err) {
      if (!supabaseWarned) {
        supabaseWarned = true;
        console.warn(
          "[pact] Supabase load failed — falling back to seed dataset:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  return getRepository().getDataset();
}

/** Invalidate the caches (used by the ingest publish path in seed mode). */
export function invalidateDataset() {
  cached = null;
  cachedDataset = null;
}
