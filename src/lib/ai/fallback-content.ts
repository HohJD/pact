import type { AnalystResponse } from "@/lib/domain/schema";

/**
 * Lead-authored deterministic analyst responses.
 *
 * Used when OpenRouter is unavailable, misconfigured, returns malformed output, or when
 * demo mode requests deterministic behaviour. Every claim below cites only seeded evidence
 * IDs and respects the inference labels on the seeded outcomes. Wording deliberately avoids
 * causal attribution where the evidence is descriptive or correlational.
 */

export type FallbackEntry = {
  id: string;
  /** All of these tokens must appear (case-insensitive) for the entry to match. */
  must: string[][]; // list of alternatives groups: each group needs at least one token present
  response: Omit<AnalystResponse, "source">;
};

export const FALLBACK_RESPONSES: FallbackEntry[] = [
  {
    id: "heat_pump_acceleration",
    must: [["heat pump", "heat-pump", "heatpump"], ["accelerat", "adoption", "effective", "success", "increase", "uptake", "which polic"]],
    response: {
      answer:
        "PACT's data points to a consistent pattern rather than a single winning policy. Markets with the fastest heat-pump growth combined a generous, stable subsidy with a regulatory signal against fossil heating and a favourable electricity-to-gas price ratio [1]. Germany's BEG grant was followed by record sales in 2022–23, but demand fell 46% in 2024 after the contested GEG debate and lower gas prices — a sign that policy uncertainty matters as much as grant size [2][3]. France is Europe's largest market by units, supported by MaPrimeRénov' and an already-electrified heating base [4]. Norway reached the highest household penetration in Europe through an oil-heating ban paired with Enova support on top of cheap hydro electricity [5]. The UK's Boiler Upgrade Scheme ran well below forecast until the grant rose to £7,500 in October 2023, after which applications roughly doubled [6][7]. Note that most of this evidence is descriptive or correlational: PACT holds no causal evaluation attributing national heat-pump growth to a specific instrument.",
      claims: [
        {
          text: "High-uptake heat-pump markets combine financial incentives, restrictions on fossil heating and favourable electricity/gas price ratios; policy stability matters.",
          evidence_ids: ["ev_rosenow_2022", "ev_iea_future_hp_2022"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "German heat-pump sales rose to 236,000 in 2022 (+53%) and a record 356,000 in 2023 (+51%) under the BEG subsidy, then fell to 193,000 in 2024 (−46%).",
          evidence_ids: ["ev_bwp_sales"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "The 2023 GEG debate and falling gas prices are cited as drivers of the 2024 decline; this is a correlational reading, not an attribution to the subsidy's design.",
          evidence_ids: ["ev_agora_waermewende", "ev_bdh_2023"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "France is the largest European heat-pump market by units, with MaPrimeRénov' issuing roughly 670,000 grants in 2022, heat pumps a leading measure.",
          evidence_ids: ["ev_ehpa_market", "ev_anah_mpr_stats"],
          confidence: "HIGH",
          inference_type: "SYNTHESISED",
        },
        {
          text: "Norway has the highest heat-pump penetration in Europe (around 60% of households) alongside a ban on fossil oil heating effective 2020.",
          evidence_ids: ["ev_iea_future_hp_2022", "ev_ssb_no"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "UK Boiler Upgrade Scheme uptake was well below forecast in its first years.",
          evidence_ids: ["ev_nao_home_heating_2024"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "After the UK grant increased to £7,500 in October 2023, monthly applications roughly doubled — observed after the change, with no counterfactual.",
          evidence_ids: ["ev_desnz_bus_stats"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
      ],
      citations: [
        "ev_rosenow_2022",
        "ev_iea_future_hp_2022",
        "ev_bwp_sales",
        "ev_agora_waermewende",
        "ev_bdh_2023",
        "ev_ehpa_market",
        "ev_anah_mpr_stats",
        "ev_ssb_no",
        "ev_nao_home_heating_2024",
        "ev_desnz_bus_stats",
      ],
      confidence: "MEDIUM",
      actions: [
        { type: "CHANGE_VIEW", view: "GRAPH" },
        { type: "FILTER_GRAPH", technology_ids: ["tech_heat_pump"] },
        {
          type: "HIGHLIGHT_NODES",
          node_ids: ["pol_de_beg", "pol_de_beg_em_2024", "pol_fr_maprimerenov", "pol_no_oil_ban", "pol_gb_bus", "tech_heat_pump"],
        },
      ],
      insufficient_evidence: false,
    },
  },
  {
    id: "compare_uk_de_retrofit",
    must: [["compar"], ["uk", "united kingdom", "british", "britain"], ["german", "germany"]],
    response: {
      answer:
        "The UK and Germany both subsidise heat pumps, but the architecture differs. The UK Boiler Upgrade Scheme is a flat £7,500 grant (raised from £5,000 in October 2023) paid via MCS-certified installers, with no income banding and no accompanying loan [1]. Germany's 2024 BEG heating subsidy stacks a 30% base grant with speed, income and efficiency bonuses up to 70% of €30,000 eligible cost, adds a low-interest KfW loan, and sits alongside the GEG requirement that new heating systems run on 65% renewable energy [2]. For whole-house retrofit, Germany has a long tradition of KfW concessional loans tied to Effizienzhaus standards, whereas the UK relies on the ECO supplier obligation for low-income homes and closed its Green Homes Grant after six months [3][4]. Outcomes: German sales grew strongly in 2022–23 and fell sharply in 2024; UK uptake ran below forecast then roughly doubled after the grant uplift [5][6]. Both are correlational observations — neither country has a published causal evaluation of these schemes in PACT.",
      claims: [
        {
          text: "The UK grant is a flat £7,500 per heat pump with no income banding; uptake ran well below forecast in the first years.",
          evidence_ids: ["ev_nao_home_heating_2024"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Germany combines a percentage-based grant with income bonuses and a concessional loan, paired with the GEG 65% renewable heating rule.",
          evidence_ids: ["ev_agora_waermewende"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "The UK's Green Homes Grant improved around 47,500 homes against a 600,000 ambition and closed within six months.",
          evidence_ids: ["ev_nao_ghg_2021"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Germany's earlier MAP grants were evaluated as leveraging substantial private renewable-heat investment, with free-rider effects noted.",
          evidence_ids: ["ev_map_evaluation"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "German heat-pump sales: 236,000 (2022), 356,000 (2023), 193,000 (2024).",
          evidence_ids: ["ev_bwp_sales"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "UK BUS applications roughly doubled after the October 2023 grant uplift.",
          evidence_ids: ["ev_desnz_bus_stats", "ev_ccc_progress_2024"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
      ],
      citations: ["ev_nao_home_heating_2024", "ev_agora_waermewende", "ev_nao_ghg_2021", "ev_map_evaluation", "ev_bwp_sales", "ev_desnz_bus_stats", "ev_ccc_progress_2024"],
      confidence: "MEDIUM",
      actions: [
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_gb_bus", "pol_de_beg_em_2024", "jur_gb", "jur_de"] },
        { type: "COMPARE_POLICIES", policy_ids: ["pol_gb_bus", "pol_de_beg_em_2024"] },
      ],
      insufficient_evidence: false,
    },
  },
  {
    id: "uk_learn_from_germany",
    must: [["learn", "lesson"], ["uk", "united kingdom", "britain", "british"], ["german", "germany"]],
    response: {
      answer:
        "Three lessons are supported by the evidence PACT holds; none is a prediction. First, stability: Germany's 2024 sales collapse followed a year of public uncertainty over the GEG, suggesting that a clear, durable regulatory signal matters at least as much as grant generosity [1][2]. The UK's own Green Homes Grant showed the cost of stop-start design [3]. Second, pairing subsidy with regulation: Germany's grant operates alongside the 65% renewable heating requirement; the UK has announced a Clean Heat Market Mechanism but it has only applied since 2025 [4]. Third, the price environment: both IEA and peer-reviewed comparative work identify the electricity-to-gas price ratio as a central barrier, and the Climate Change Committee has recommended removing policy costs from UK electricity prices [5][6]. What the evidence does not show is that Germany's income-banded, percentage-based grant produced better value than the UK's flat grant — no causal evaluation of either scheme is available in PACT, and the two countries differ in ownership structure (47% vs 64% owner-occupiers) and heating mix.",
      claims: [
        {
          text: "German heat-pump sales fell 46% in 2024 after record 2023 sales.",
          evidence_ids: ["ev_bwp_sales"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Policy uncertainty during the 2023 GEG debate depressed heat-pump demand and coincided with record gas-boiler sales.",
          evidence_ids: ["ev_agora_waermewende", "ev_bdh_2023"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "The UK Green Homes Grant was designed in 12 weeks, reached about 47,500 homes against a 600,000 ambition, and closed after six months.",
          evidence_ids: ["ev_nao_ghg_2021"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Combining regulation, subsidy and carbon pricing is identified as necessary for Germany's heat transition; the UK equivalent regulatory signal (CHMM) only started in 2025.",
          evidence_ids: ["ev_agora_waermewende", "ev_ccc_progress_2024"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "The electricity-to-gas price ratio is a central barrier to heat-pump adoption across markets.",
          evidence_ids: ["ev_iea_future_hp_2022", "ev_rosenow_2022"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "The Climate Change Committee recommends removing policy costs from UK electricity prices and confirming the Clean Heat Market Mechanism.",
          evidence_ids: ["ev_ccc_progress_2024"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Whether Germany's percentage-based, income-banded grant outperforms the UK's flat grant cannot be established from available evidence.",
          evidence_ids: [],
          confidence: "LOW",
          inference_type: "UNCERTAIN",
        },
      ],
      citations: ["ev_bwp_sales", "ev_agora_waermewende", "ev_bdh_2023", "ev_nao_ghg_2021", "ev_ccc_progress_2024", "ev_iea_future_hp_2022", "ev_rosenow_2022"],
      confidence: "MEDIUM",
      actions: [
        { type: "FOCUS_COUNTRY", country: "DE" },
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_de_beg_em_2024", "pol_de_geg_2024", "pol_gb_bus", "pol_gb_chmm", "pol_gb_ggg"] },
      ],
      insufficient_evidence: false,
    },
  },
  {
    id: "financing_retrofits",
    must: [["financ", "loan", "fund"], ["retrofit", "renovation", "insulation", "efficiency"]],
    response: {
      answer:
        "Countries finance residential retrofits through four broad routes in PACT's data. Concessional loans: France's éco-PTZ offers 0% loans up to €50,000, the Netherlands' Warmtefonds lends at 0% to lower-income owners, and Germany's KfW programmes historically tied low-interest loans to Effizienzhaus standards [1]. Supplier obligations: the UK's ECO4 (~£1bn/yr) and France's CEE white certificates shift costs onto energy suppliers [2]. Direct grants: MaPrimeRénov' (~€2–4bn/yr), the UK Social Housing Decarbonisation Fund and Germany's BEG [3]. Tax credits: the US §25C credit, claimed by over 2.3 million households in tax year 2023 [4]. On what these deliver, the strongest evidence is from the US Weatherization Assistance Program, where a randomised evaluation found realised savings of roughly 10–20% — well below engineering projections — and later work attributed much of the gap to contractor quality [5][6]. European schemes are mostly evaluated through audits rather than causal studies: the French Cour des comptes found many single-measure grants but few deep renovations [7].",
      claims: [
        {
          text: "Concessional loans (éco-PTZ, Warmtefonds, KfW) are a common financing route; PACT holds no causal evaluation of their effect.",
          evidence_ids: [],
          confidence: "MEDIUM",
          inference_type: "INFERRED",
        },
        {
          text: "The UK's ECO and France's CEE place retrofit funding obligations on energy suppliers.",
          evidence_ids: ["ev_cour_des_comptes_mpr"],
          confidence: "MEDIUM",
          inference_type: "INFERRED",
        },
        {
          text: "MaPrimeRénov' issued around 644,000 grants in 2021 and 670,000 in 2022.",
          evidence_ids: ["ev_anah_mpr_stats"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Over 2.3 million US households claimed the §25C credit in tax year 2023, about 267,000 of them for heat pumps.",
          evidence_ids: ["ev_irs_25c_2023"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "A randomised evaluation of the Weatherization Assistance Program found realised savings of about 10–20%, roughly 2.5 times lower than modelled.",
          evidence_ids: ["ev_fowlie_wap_2018"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Much of the projected-vs-realised savings gap is attributable to contractor quality rather than household behaviour.",
          evidence_ids: ["ev_christensen_wap_2021"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "French audit found MaPrimeRénov' delivered many single-measure grants but few deep renovations, with weak outcome monitoring.",
          evidence_ids: ["ev_cour_des_comptes_mpr"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
      ],
      citations: ["ev_cour_des_comptes_mpr", "ev_anah_mpr_stats", "ev_irs_25c_2023", "ev_fowlie_wap_2018", "ev_christensen_wap_2021"],
      confidence: "MEDIUM",
      actions: [
        { type: "FILTER_GRAPH", mechanism_ids: ["mech_loan", "mech_obligation", "mech_grant", "mech_tax_credit"], technology_ids: ["tech_insulation", "tech_whole_house_retrofit"] },
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_fr_eco_ptz", "pol_nl_warmtefonds", "pol_de_kfw_effizienzhaus", "pol_gb_eco4", "pol_fr_cee", "pol_us_wap"] },
      ],
      insufficient_evidence: false,
    },
  },
  {
    id: "strongest_evidence_energy_consumption",
    must: [["evidence", "strongest", "rigorous"], ["energy consumption", "energy use", "savings", "reduc"]],
    response: {
      answer:
        "The strongest evidence in PACT on reducing household energy consumption concerns the US Weatherization Assistance Program. A randomised encouragement study in Michigan found realised savings of roughly 10–20%, about 2.5 times lower than engineering models predicted, with upfront costs exceeding the value of energy saved and no significant rebound [1]. A national quasi-experimental evaluation of the same programme found average gas savings around 18% in single-family homes and judged it cost-effective once non-energy benefits were included [2]. Follow-up work attributed much of the performance gap to contractor quality [3]. For European building policies the evidence is weaker: audits of the UK's Green Homes Grant and France's MaPrimeRénov' describe delivery and volumes but do not measure consumption effects [4][5]. PACT therefore classifies most European retrofit evidence as descriptive — insufficient to rank those policies by energy savings.",
      claims: [
        {
          text: "Randomised evaluation of WAP: realised savings ~10–20%, modelled savings ~2.5× higher, no significant rebound.",
          evidence_ids: ["ev_fowlie_wap_2018"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "National WAP evaluation: ~18% gas savings in single-family homes; cost-effective including non-energy benefits.",
          evidence_ids: ["ev_ornl_wap_2015"],
          confidence: "HIGH",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "Contractor quality explains a large share of the projected-vs-realised savings gap.",
          evidence_ids: ["ev_christensen_wap_2021"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
        {
          text: "European retrofit schemes in PACT are evaluated through delivery audits, not consumption measurements.",
          evidence_ids: ["ev_nao_ghg_2021", "ev_cour_des_comptes_mpr"],
          confidence: "MEDIUM",
          inference_type: "SYNTHESISED",
        },
        {
          text: "Insufficient evidence to rank European building policies by measured energy savings.",
          evidence_ids: [],
          confidence: "LOW",
          inference_type: "UNCERTAIN",
        },
      ],
      citations: ["ev_fowlie_wap_2018", "ev_ornl_wap_2015", "ev_christensen_wap_2021", "ev_nao_ghg_2021", "ev_cour_des_comptes_mpr"],
      confidence: "MEDIUM",
      actions: [
        { type: "OPEN_POLICY", policy_id: "pol_us_wap" },
        { type: "SHOW_EVIDENCE", policy_id: "pol_us_wap" },
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_us_wap", "pol_gb_ggg", "pol_fr_maprimerenov"] },
      ],
      insufficient_evidence: false,
    },
  },
  {
    id: "low_interest_loans",
    must: [["loan"]],
    response: {
      answer:
        "Policies in PACT that use concessional or low-interest loans: France's éco-prêt à taux zéro (0% up to €50,000, combinable with MaPrimeRénov'), the Netherlands' Nationaal Warmtefonds (0% for lower incomes since 2023), Germany's KfW Effizienzhaus loans (now folded into BEG) and the supplementary loan in Germany's 2024 heating subsidy, plus the UK's announced Warm Homes Plan. PACT holds no causal evaluation of these loan instruments; descriptive context on retrofit financing comes from audit and comparative reports [1].",
      claims: [
        {
          text: "Loan-based instruments are common across France, the Netherlands, Germany and the UK; no causal evaluation of them is held in PACT.",
          evidence_ids: [],
          confidence: "MEDIUM",
          inference_type: "UNCERTAIN",
        },
        {
          text: "Deep renovations remain rare relative to single-measure grants in France despite available finance.",
          evidence_ids: ["ev_cour_des_comptes_mpr"],
          confidence: "MEDIUM",
          inference_type: "DIRECTLY_SUPPORTED",
        },
      ],
      citations: ["ev_cour_des_comptes_mpr"],
      confidence: "LOW",
      actions: [
        { type: "FILTER_GRAPH", mechanism_ids: ["mech_loan"] },
        { type: "HIGHLIGHT_NODES", node_ids: ["pol_fr_eco_ptz", "pol_nl_warmtefonds", "pol_de_kfw_effizienzhaus", "pol_de_beg_em_2024", "pol_gb_warm_homes_plan"] },
      ],
      insufficient_evidence: false,
    },
  },
];

/** Generic response when nothing matches and the LLM is unavailable. */
export const FALLBACK_GENERIC: Omit<AnalystResponse, "source"> = {
  answer:
    "PACT could not reach its analysis model and has no curated response for this question. The workspace still shows the policies, evidence and outcomes retrieved for your query — use the graph, map and outcomes tabs to inspect them directly. Insufficient evidence to generate a synthesised answer offline.",
  claims: [],
  citations: [],
  confidence: "LOW",
  actions: [],
  insufficient_evidence: true,
};

/**
 * Deterministic matcher — client-safe (used by /demo without any network call)
 * and reused by the server analyst when the provider is unavailable or fails.
 */
export function matchFallback(question: string): AnalystResponse {
  const q = question.toLowerCase();
  for (const entry of FALLBACK_RESPONSES) {
    const match = entry.must.every((group) =>
      group.some((tok) => q.includes(tok.toLowerCase())),
    );
    if (match) return { ...entry.response, source: "FALLBACK" };
  }
  return { ...FALLBACK_GENERIC, source: "FALLBACK" };
}
