import { Dataset, Policy } from "@/lib/domain/schema";
import cpdb from "./cpdb.json";
import { curatedDataset } from "./curated";

export { curatedDataset };

/**
 * Building and heating policies imported from the Climate Policy Database
 * (`pnpm import:cpdb`). data_status IMPORTED: hidden unless the workspace
 * "Include CPDB" filter is on, and never linked to evidence.
 */
export const importedPolicies: Policy[] = Policy.array().parse(cpdb);

export const seedDataset: Dataset = {
  ...curatedDataset,
  policies: [...curatedDataset.policies, ...importedPolicies],
};
