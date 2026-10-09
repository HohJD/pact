import type { Dataset } from "@/lib/domain/schema";

export interface WorkspaceDeepLink {
  /** policy to select + open in DETAILS, or null */
  policyId: string | null;
  /** policies to pre-load into the compare tray (validated, deduped) */
  compareIds: string[];
}

/**
 * Parse `?policy=<id>` and `?compare=<id>,<id>…` workspace params. Unknown
 * ids are dropped rather than 404ing — deep links degrade gracefully.
 */
export function parseWorkspaceParams(
  params: Pick<URLSearchParams, "get">,
  dataset: Pick<Dataset, "policies">,
): WorkspaceDeepLink {
  const valid = new Set(dataset.policies.map((p) => p.id));
  const dedupe = (ids: string[]) =>
    [...new Set(ids)].filter((id) => valid.has(id));

  const policy = params.get("policy");
  const policyId = policy && valid.has(policy) ? policy : null;

  const compare = params.get("compare");
  const compareIds = compare
    ? dedupe(compare.split(",").map((s) => s.trim())).slice(0, 4)
    : [];

  return { policyId, compareIds };
}
