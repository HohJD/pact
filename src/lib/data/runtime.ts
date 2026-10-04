import type { Dataset, Evidence, Policy } from "@/lib/domain/schema";

/**
 * Runtime additions for seed mode: policies published from the ingestion
 * pipeline and CANDIDATE evidence accepted via "Add to workspace" live in
 * memory for the life of the server process only. In Supabase mode published
 * policies are upserted to the `policies` table instead.
 */
const store = globalThis as unknown as {
  __pactRuntimePolicies?: Policy[];
  __pactRuntimeEvidence?: Evidence[];
};

export function runtimePolicies(): Policy[] {
  return (store.__pactRuntimePolicies ??= []);
}

export function addRuntimePolicy(p: Policy) {
  const list = runtimePolicies();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.push(p);
}

export function runtimeEvidence(): Evidence[] {
  return (store.__pactRuntimeEvidence ??= []);
}

export function addRuntimeEvidence(e: Evidence) {
  const list = runtimeEvidence();
  const i = list.findIndex((x) => x.id === e.id);
  if (i >= 0) list[i] = e;
  else list.push(e);
}

/** Merge runtime-published records into a dataset (idempotent). */
export function withRuntimeAdditions(dataset: Dataset): Dataset {
  const extraPolicies = runtimePolicies().filter(
    (p) => !dataset.policies.some((x) => x.id === p.id),
  );
  const extraEvidence = runtimeEvidence().filter(
    (e) => !dataset.evidence.some((x) => x.id === e.id),
  );
  if (extraPolicies.length === 0 && extraEvidence.length === 0) return dataset;
  return {
    ...dataset,
    policies: [...dataset.policies, ...extraPolicies],
    evidence: [...dataset.evidence, ...extraEvidence],
  };
}
