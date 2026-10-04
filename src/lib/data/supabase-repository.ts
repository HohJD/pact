import type { PactRepository } from "./repository";

/**
 * Placeholder for the Supabase-backed repository (implemented in a later
 * handoff). Selected via PACT_DATA_SOURCE=supabase.
 */
export function createSupabaseRepository(): PactRepository {
  throw new Error("Supabase repository is not configured yet.");
}
