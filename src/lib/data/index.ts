import { seedDataset } from "@/data/seed";
import type { PactRepository } from "./repository";
import { SeedRepository } from "./seed-repository";
import { createSupabaseRepository } from "./supabase-repository";

let cached: PactRepository | null = null;

export function getRepository(): PactRepository {
  if (cached) return cached;
  cached =
    process.env.PACT_DATA_SOURCE === "supabase"
      ? createSupabaseRepository()
      : new SeedRepository(seedDataset);
  return cached;
}
