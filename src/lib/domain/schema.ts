import { z } from "zod";

/**
 * PACT domain model.
 *
 * POLICY → MECHANISM → JURISDICTION → TARGET → TECHNOLOGY → EVIDENCE → OUTCOME
 *
 * Every record carries a `data_status` so demo/sample data is always distinguishable
 * from curated public information. Nothing in this model may present synthetic
 * information as a real-world citation.
 */

export const DataStatus = z.enum([
  "CURATED", // curated from public information; details believed accurate but should be verified before citing
  "DEMO", // synthetic / illustrative sample data; never a real-world citation
  "CANDIDATE", // machine-found (web search + extraction), unreviewed; shown with a label, never counted toward evidence strength
]);
export type DataStatus = z.infer<typeof DataStatus>;

export const CountryCode = z.enum(["GB", "DE", "FR", "NL", "DK", "NO", "US", "SG", "EU"]);
export type CountryCode = z.infer<typeof CountryCode>;

export const JurisdictionLevel = z.enum(["NATIONAL", "STATE", "CITY", "SUPRANATIONAL"]);

export const Jurisdiction = z.object({
  id: z.string(), // e.g. "jur_de"
  name: z.string(),
  country_code: CountryCode,
  level: JurisdictionLevel,
  parent_id: z.string().nullable().default(null),
  lat: z.number(),
  lng: z.number(),
  context: z
    .object({
      population_m: z.number().optional(),
      dominant_heating: z.string().optional(), // e.g. "gas", "district heating", "electric"
      owner_occupier_share: z.number().optional(), // 0-1
      housing_stock_note: z.string().optional(),
      electricity_gas_price_ratio: z.number().optional(), // "spark gap" proxy; >1 means electricity costlier per kWh
      heat_pump_stock_per_1000_households: z.number().optional(),
    })
    .default({}),
  data_status: DataStatus.default("CURATED"),
});
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const Sector = z.enum(["RESIDENTIAL_BUILDINGS", "COMMERCIAL_BUILDINGS", "PUBLIC_BUILDINGS", "ALL_BUILDINGS"]);

export const Technology = z.object({
  id: z.string(), // "tech_heat_pump"
  name: z.string(),
  description: z.string(),
});
export type Technology = z.infer<typeof Technology>;

export const MechanismKind = z.enum([
  "GRANT", // capital grant / subsidy paid to the end user
  "TAX_CREDIT",
  "LOAN", // concessional / zero-interest finance
  "LOAN_GUARANTEE",
  "OBLIGATION", // supplier / market obligation (e.g. ECO, CEE, Clean Heat Market Mechanism)
  "STANDARD", // performance standard / building code
  "BAN", // phase-out / prohibition
  "CARBON_PRICE",
  "INFORMATION", // labels, audits, advice
  "DIRECT_INVESTMENT", // public procurement / public programme delivery
  "TARGET", // statutory or political target
]);

export const Mechanism = z.object({
  id: z.string(), // "mech_grant"
  kind: MechanismKind,
  name: z.string(),
  description: z.string(),
});
export type Mechanism = z.infer<typeof Mechanism>;

export const PolicyStatus = z.enum(["ACTIVE", "CLOSED", "ANNOUNCED", "SUPERSEDED", "PAUSED"]);

export const Policy = z.object({
  id: z.string(), // "pol_gb_bus"
  name: z.string(),
  short_name: z.string().optional(),
  jurisdiction_id: z.string(),
  country_code: CountryCode,
  status: PolicyStatus,
  introduced: z.string(), // ISO date or YYYY
  ended: z.string().nullable().default(null),
  sector: Sector,
  technology_ids: z.array(z.string()),
  mechanism_ids: z.array(z.string()),
  target_groups: z.array(z.string()), // "owner-occupiers", "landlords", "low-income households", "new build", "commercial owners"
  eligibility: z.string(),
  incentive: z.string(), // headline financial design, free text, e.g. "£7,500 grant per air-source heat pump"
  funding: z.string(), // who pays / budget
  objectives: z.array(z.string()),
  description: z.string(),
  implementation_notes: z.string().optional(),
  limitations: z.array(z.string()).default([]),
  sources: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url().nullable(), // null when a verified URL is not available — never invent one
        publisher: z.string(),
      }),
    )
    .default([]),
  data_status: DataStatus,
  tags: z.array(z.string()).default([]),
});
export type Policy = z.infer<typeof Policy>;

export const EvidenceType = z.enum([
  "GOVERNMENT_EVALUATION",
  "ACADEMIC_STUDY",
  "OFFICIAL_STATISTICS",
  "INDUSTRY_REPORT",
  "INSTITUTIONAL_REPORT",
]);

export const CausalStrength = z.enum([
  "DESCRIPTIVE",
  "CORRELATIONAL",
  "QUASI_EXPERIMENTAL",
  "EXPERIMENTAL",
  "META_ANALYSIS",
  "UNKNOWN",
]);
export type CausalStrength = z.infer<typeof CausalStrength>;

export const Confidence = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const Evidence = z.object({
  id: z.string(), // "ev_nao_home_heating_2024"
  title: z.string(),
  publisher: z.string(),
  authors: z.array(z.string()).default([]),
  publication_date: z.string(), // ISO or YYYY / YYYY-MM
  source_url: z.string().url().nullable(), // null when not verified — never invent
  evidence_type: EvidenceType,
  methodology: z.string(),
  geography: z.array(CountryCode),
  policy_ids: z.array(z.string()),
  /**
   * EVALUATES: assesses the linked policies themselves (audits, evaluations, impact studies).
   * MONITORS: statistics/market data describing outcomes around the policies, without attribution.
   * CONTEXT: background or technical evidence; informs interpretation but does NOT count toward
   *          a policy's evidence-strength score.
   */
  policy_relevance: z.enum(["EVALUATES", "MONITORS", "CONTEXT"]).default("MONITORS"),
  metrics: z.array(z.string()), // metric ids this evidence speaks to
  findings: z.array(z.string()),
  limitations: z.array(z.string()),
  confidence: Confidence,
  causal_strength: CausalStrength,
  data_status: DataStatus,
});
export type Evidence = z.infer<typeof Evidence>;

export const Metric = z.object({
  id: z.string(), // "metric_hp_sales"
  name: z.string(),
  unit: z.string(),
  description: z.string(),
  higher_is_better: z.boolean(),
});
export type Metric = z.infer<typeof Metric>;

export const Direction = z.enum(["UP", "DOWN", "FLAT", "MIXED"]);

/** An observed change in a metric around a policy. Inference type is explicit. */
export const Outcome = z.object({
  id: z.string(),
  policy_id: z.string(),
  metric_id: z.string(),
  headline: z.string(), // "Heat-pump sales rose 51% in 2023"
  direction: Direction,
  magnitude: z.string().optional(), // "+51%"
  period: z.string(), // "2022–2023"
  inference: z.enum(["CAUSAL", "CORRELATIONAL", "DESCRIPTIVE"]), // what the linked evidence supports
  evidence_ids: z.array(z.string()).min(1),
  note: z.string().optional(),
  data_status: DataStatus,
});
export type Outcome = z.infer<typeof Outcome>;

export const TimeSeriesPoint = z.object({ year: z.number().int(), value: z.number() });

export const TimeSeries = z.object({
  id: z.string(),
  metric_id: z.string(),
  country_code: CountryCode,
  jurisdiction_id: z.string(),
  points: z.array(TimeSeriesPoint),
  source_evidence_id: z.string().nullable(), // evidence record the series is attributed to
  precision: z.enum(["REPORTED", "APPROXIMATE", "ILLUSTRATIVE"]), // ILLUSTRATIVE == DEMO shape, not data
  data_status: DataStatus,
  note: z.string().optional(),
});
export type TimeSeries = z.infer<typeof TimeSeries>;

export const RelationType = z.enum([
  "IMPLEMENTED_BY",
  "USES_MECHANISM",
  "TARGETS",
  "SIMILAR_TO",
  "SUPPORTED_BY",
  "ASSOCIATED_WITH",
  "EVALUATED_BY",
  "SUPERSEDES",
]);

export const SimilarityBreakdown = z.object({
  semantic: z.number().min(0).max(1),
  same_sector: z.boolean(),
  same_mechanism: z.boolean(),
  same_target: z.boolean(),
  same_technology: z.boolean(),
  jurisdiction_similarity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  overall: z.number().min(0).max(1),
  differences: z.array(z.string()),
});

export const Similarity = z.object({
  id: z.string(),
  policy_a: z.string(),
  policy_b: z.string(),
  breakdown: SimilarityBreakdown,
});
export type Similarity = z.infer<typeof Similarity>;

/** A claim produced by the analyst. Every claim must be traceable. */
export const InferenceType = z.enum(["DIRECTLY_SUPPORTED", "SYNTHESISED", "INFERRED", "UNCERTAIN"]);

export const Claim = z.object({
  text: z.string(),
  evidence_ids: z.array(z.string()),
  confidence: Confidence,
  inference_type: InferenceType,
});
export type Claim = z.infer<typeof Claim>;

export const UIAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FOCUS_COUNTRY"), country: CountryCode }),
  z.object({ type: z.literal("OPEN_POLICY"), policy_id: z.string() }),
  z.object({ type: z.literal("COMPARE_POLICIES"), policy_ids: z.array(z.string()).min(2).max(4) }),
  z.object({
    type: z.literal("FILTER_GRAPH"),
    technology_ids: z.array(z.string()).optional(),
    mechanism_ids: z.array(z.string()).optional(),
    countries: z.array(CountryCode).optional(),
  }),
  z.object({ type: z.literal("SHOW_OUTCOMES"), policy_id: z.string().optional() }),
  z.object({ type: z.literal("SHOW_EVIDENCE"), evidence_id: z.string().optional(), policy_id: z.string().optional() }),
  z.object({ type: z.literal("CHANGE_VIEW"), view: z.enum(["GRAPH", "MAP", "TIMELINE", "OUTCOMES"]) }),
  z.object({ type: z.literal("HIGHLIGHT_NODES"), node_ids: z.array(z.string()) }),
]);
export type UIAction = z.infer<typeof UIAction>;

export const AnalystResponse = z.object({
  answer: z.string(),
  claims: z.array(Claim),
  citations: z.array(z.string()), // evidence ids
  confidence: Confidence,
  actions: z.array(UIAction),
  insufficient_evidence: z.boolean().default(false),
  source: z.enum(["LLM", "FALLBACK"]).default("LLM"),
});
export type AnalystResponse = z.infer<typeof AnalystResponse>;

export const Dataset = z.object({
  jurisdictions: z.array(Jurisdiction),
  technologies: z.array(Technology),
  mechanisms: z.array(Mechanism),
  metrics: z.array(Metric),
  policies: z.array(Policy),
  evidence: z.array(Evidence),
  outcomes: z.array(Outcome),
  time_series: z.array(TimeSeries),
  similarities: z.array(Similarity),
});
export type Dataset = z.infer<typeof Dataset>;
