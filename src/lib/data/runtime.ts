import type { Dataset, Policy } from "@/lib/domain/schema";

/**
 * Runtime additions for seed mode: policies published from the ingestion
 * pipeline live in memory for the life of the server process only. In Supabase
 * mode published policies are upserted to the `policies` table instead.
 */
const store = globalThis as unknown as { __pactRuntimePolicies?: Policy[] };

export function runtimePolicies(): Policy[] {
  return (store.__pactRuntimePolicies ??= []);
}

export function addRuntimePolicy(p: Policy) {
  const list = runtimePolicies();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.push(p);
}

/** Merge runtime-published policies into a dataset (idempotent). */
export function withRuntimeAdditions(dataset: Dataset): Dataset {
  const extra = runtimePolicies().filter(
    (p) => !dataset.policies.some((x) => x.id === p.id),
  );
  if (extra.length === 0) return dataset;
  return { ...dataset, policies: [...dataset.policies, ...extra] };
}
