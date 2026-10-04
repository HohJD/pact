import type { Metric } from "@/lib/domain/schema";

export const metrics: Metric[] = [
  {
    id: "metric_hp_sales",
    name: "Annual heat-pump sales",
    unit: "units",
    description: "Annual heat-pump sales or shipments.",
    higher_is_better: true,
  },
  {
    id: "metric_hp_installs_certified",
    name: "Certified heat-pump installations",
    unit: "units",
    description: "Certified heat-pump installations (e.g. MCS-certified).",
    higher_is_better: true,
  },
  {
    id: "metric_grants_issued",
    name: "Grants / vouchers paid",
    unit: "count",
    description: "Grants, vouchers or credits paid or claimed.",
    higher_is_better: true,
  },
  {
    id: "metric_retrofits",
    name: "Homes retrofitted",
    unit: "count",
    description: "Homes receiving retrofit measures.",
    higher_is_better: true,
  },
  {
    id: "metric_energy_consumption",
    name: "Household energy consumption",
    unit: "index / %",
    description: "Household energy consumption, expressed as an index or percentage change.",
    higher_is_better: false,
  },
  {
    id: "metric_emissions",
    name: "Building sector emissions",
    unit: "MtCO2e",
    description: "Building sector greenhouse-gas emissions.",
    higher_is_better: false,
  },
  {
    id: "metric_gas_boiler_sales",
    name: "Gas boiler sales",
    unit: "units",
    description: "Annual gas boiler sales.",
    higher_is_better: false,
  },
  {
    id: "metric_public_spend",
    name: "Programme spend",
    unit: "local currency m",
    description: "Programme expenditure in local currency (millions).",
    higher_is_better: true,
  },
  {
    id: "metric_energy_label",
    name: "Stock at energy label C or better",
    unit: "%",
    description: "Share of building stock at energy label C or better.",
    higher_is_better: true,
  },
  {
    id: "metric_green_mark_share",
    name: "GFA Green Mark certified",
    unit: "%",
    description: "Share of gross floor area Green Mark certified.",
    higher_is_better: true,
  },
];
