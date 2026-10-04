import { Dataset } from "@/lib/domain/schema";
import { evidence } from "./evidence";
import { jurisdictions } from "./jurisdictions";
import { mechanisms } from "./mechanisms";
import { metrics } from "./metrics";
import { outcomes } from "./outcomes";
import { policies } from "./policies";
import { similarities } from "./similarities";
import { technologies } from "./technologies";
import { timeSeries } from "./time-series";

export const seedDataset: Dataset = Dataset.parse({
  jurisdictions,
  technologies,
  mechanisms,
  metrics,
  policies,
  evidence,
  outcomes,
  time_series: timeSeries,
  similarities,
});
