import { createClient } from "@supabase/supabase-js";

import { Dataset, type Dataset as DatasetT } from "@/lib/domain/schema";
import { SeedRepository } from "./seed-repository";
import type { PactRepository } from "./repository";

const DOMAIN_TABLES = [
  "jurisdictions",
  "technologies",
  "mechanisms",
  "metrics",
  "policies",
  "evidence",
  "outcomes",
  "time_series",
  "similarities",
] as const;

/** Fields modelled as `.nullable()` in the Zod schema — null is meaningful and must be kept. */
const KEEP_NULL_FIELDS = new Set([
  "parent_id",
  "ended",
  "source_url",
  "source_evidence_id",
]);

/**
 * Postgres returns null for empty nullable columns; the Zod schema models them
 * as optional. Shallow only — nested jsonb (points, sources, breakdown, context)
 * is left untouched.
 */
export const stripNulls = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).filter(([k, v]) => v !== null || KEEP_NULL_FIELDS.has(k)),
  );

/**
 * Supabase-backed repository. All PactRepository behaviour is in-memory over a
 * Dataset, so once the 9 domain tables are loaded and validated the repository
 * is identical to the seed repository — the swap happens at the data boundary.
 * Server-side only: the anon key is read from env here, never in client code.
 */
export class SupabaseRepository extends SeedRepository {
  private constructor(dataset: DatasetT) {
    super(dataset);
  }

  static async load(): Promise<SupabaseRepository> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
    }
    const client = createClient(url, key, { auth: { persistSession: false } });
    const raw: Record<string, unknown[]> = {};
    for (const table of DOMAIN_TABLES) {
      const { data, error } = await client.from(table).select("*");
      if (error) throw new Error(`supabase ${table}: ${error.message}`);
      raw[table] = (data ?? []).map(stripNulls);
    }
    return new SupabaseRepository(Dataset.parse(raw));
  }
}

/** Convenience factory matching the previous call-site signature. */
export function createSupabaseRepository(): Promise<PactRepository> {
  return SupabaseRepository.load();
}
