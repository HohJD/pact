import type { Claim, UIAction } from "@/lib/domain/schema";

/** Lead-authored deterministic Policy Transfer assessments used when the model is unavailable. */
export type TransferAssessment = {
  transferability: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;
  similarities: string[];
  differences: string[];
  lessons: Claim[];
  evidence_confidence: "LOW" | "MEDIUM" | "HIGH";
  caveats: string[];
  actions: UIAction[];
  source: "LLM" | "FALLBACK";
};

export const TRANSFER_FALLBACKS: Array<{
  id: string;
  target_jurisdiction_ids: string[];
  source_policy_ids: string[];
  assessment: Omit<TransferAssessment, "source">;
}> = [
  {
    id: "oxford_from_german_retrofit",
    target_jurisdiction_ids: ["jur_gb_oxford", "jur_gb"],
    source_policy_ids: ["pol_de_beg", "pol_de_beg_em_2024", "pol_de_kfw_effizienzhaus", "pol_de_geg_2024"],
    assessment: {
      transferability: "MEDIUM",
      rationale:
        "Oxford shares Germany's old, gas-heated housing stock and heating demand, but a city council lacks the fiscal and regulatory powers behind BEG and the GEG; lessons transfer at the level of programme design and delivery, not instrument choice.",
      similarities: [
        "Mature, predominantly pre-1980 housing stock with significant retrofit need",
        "Gas is the dominant heating fuel in both contexts",
        "Comparable heating-degree demand in a temperate climate",
        "Both operate within national heat-pump targets (UK 600,000/yr by 2028; EU/German heat transition)",
      ],
      differences: [
        "Electricity-to-gas price ratio is higher in the UK (~4 vs ~3), weakening heat-pump running-cost economics",
        "Owner-occupation is higher in the UK (~64% vs ~47%); Germany's landlord-heavy stock shaped its loan-based KfW approach",
        "A city council cannot set grant levels, heating standards or carbon prices — those are UK national instruments (BUS, CHMM, Future Homes Standard)",
        "Germany's municipal heat planning duty (Wärmeplanungsgesetz) has no direct English equivalent",
      ],
      lessons: [
        {
          text: "Policy stability matters: German heat-pump sales fell 46% in 2024 after a year of public uncertainty over the GEG, following record 2023 sales.",
          evidence_ids: ["ev_bwp_sales", "ev_agora_waermewende"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "Pairing grants with a clear regulatory signal and attention to the electricity/gas price ratio is identified as necessary for a heat transition — a lesson for national rather than city-level design.",
          evidence_ids: ["ev_agora_waermewende", "ev_iea_future_hp_2022"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "Germany's MAP grants were evaluated as leveraging substantial private investment with notable free-rider effects — relevant to how a local scheme targets support.",
          evidence_ids: ["ev_map_evaluation"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Municipal heat planning (zoning for district heating vs individual heat pumps) is a local lever Oxford could emulate; PACT holds no outcome evidence on it yet.",
          evidence_ids: [],
          confidence: "LOW",
          inference_type: "INFERRED",
        },
        {
          text: "Whether German-style percentage-based, income-banded grants deliver better value than flat UK grants cannot be established from available evidence.",
          evidence_ids: [],
          confidence: "LOW",
          inference_type: "UNCERTAIN",
        },
      ],
      evidence_confidence: "MEDIUM",
      caveats: [
        "This is an evidence-based comparison of contexts and observed outcomes, not a forecast of what would happen in Oxford.",
        "Most German evidence in PACT is descriptive or correlational market data; no causal evaluation of BEG is available.",
        "Local powers, budgets and delivery capacity are not captured in PACT's jurisdiction context fields.",
      ],
      actions: [
        { type: "FOCUS_COUNTRY", country: "DE" },
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_de_beg", "pol_de_beg_em_2024", "pol_de_geg_2024", "pol_de_waermeplanung", "jur_gb_oxford"] },
      ],
    },
  },
];

export const TRANSFER_INSUFFICIENT: Omit<TransferAssessment, "source"> = {
  transferability: "LOW",
  rationale: "PACT holds too little evidence on this source policy or target jurisdiction to assess contextual fit.",
  similarities: [],
  differences: [],
  lessons: [
    { text: "Insufficient evidence to derive transferable lessons.", evidence_ids: [], confidence: "LOW", inference_type: "UNCERTAIN" },
  ],
  evidence_confidence: "LOW",
  caveats: ["This is an evidence-based comparison, not a prediction."],
  actions: [],
};
