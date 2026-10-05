import type { Similarity } from "@/lib/domain/schema";
import { structuredSimilarity } from "@/lib/similarity/structured";
import { jurisdictions } from "./jurisdictions";
import { policies } from "./policies";

const policyById = new Map(policies.map((p) => [p.id, p]));

/**
 * Curated similarity pairs with overall scores and difference notes from
 * docs/seed-catalogue.md. Booleans are computed from the policy records;
 * `semantic` tracks the curated overall within a small adjustment.
 */
const curated: Array<{ a: string; b: string; overall: number; differences: string[] }> = [
  {
    a: "pol_gb_bus",
    b: "pol_de_beg_em_2024",
    overall: 0.82,
    differences: [
      "Both are consumer heat-pump grant schemes.",
      "Germany adds an income bonus and a supplementary low-interest loan.",
      "The German grant sits alongside the GEG 65% renewable rule; the UK grant is flat.",
    ],
  },
  {
    a: "pol_gb_bus",
    b: "pol_fr_maprimerenov",
    overall: 0.74,
    differences: [
      "France bands grants by income and covers multiple measures.",
      "BUS is a flat per-technology grant.",
    ],
  },
  { a: "pol_gb_bus", b: "pol_nl_isde", overall: 0.78, differences: ["Both subsidise heat pumps and insulation in existing homes; ISDE also covers solar thermal."] },
  {
    a: "pol_gb_bus",
    b: "pol_us_25c",
    overall: 0.66,
    differences: ["25C is a tax credit claimed after spend; BUS is an upfront grant."],
  },
  { a: "pol_gb_bus", b: "pol_dk_bygningspulje", overall: 0.76, differences: ["Both are renovation grant pools covering heat pumps; Denmark also funds insulation broadly."] },
  { a: "pol_de_beg", b: "pol_fr_maprimerenov", overall: 0.79, differences: ["Both are flagship national renovation support schemes combining grants across multiple measures."] },
  { a: "pol_gb_eco4", b: "pol_fr_cee", overall: 0.81, differences: ["Both are energy-supplier obligations funding efficiency upgrades."] },
  { a: "pol_gb_eco4", b: "pol_us_wap", overall: 0.72, differences: ["Both target low-income households; WAP is publicly delivered rather than an obligation."] },
  { a: "pol_gb_chmm", b: "pol_nl_hybrid_norm", overall: 0.58, differences: ["CHMM obliges manufacturers; the Dutch norm would have obliged households at boiler replacement."] },
  { a: "pol_de_geg_2024", b: "pol_no_oil_ban", overall: 0.71, differences: ["Norway bans one fuel outright; GEG sets a 65% renewable requirement for new systems."] },
  { a: "pol_de_geg_2024", b: "pol_nl_gasloos_nieuwbouw", overall: 0.69, differences: ["The Dutch ban applies only to new-build gas connections."] },
  { a: "pol_de_geg_2024", b: "pol_us_ny_all_electric", overall: 0.66, differences: ["New York prohibits fossil equipment in new construction only."] },
  { a: "pol_no_oil_ban", b: "pol_dk_oil_ban_new", overall: 0.84, differences: ["Both are oil/gas boiler bans; Denmark began with new build, Norway covers all buildings."] },
  { a: "pol_us_nyc_ll97", b: "pol_nl_label_c_kantoren", overall: 0.7, differences: ["Both are performance floors for existing non-residential buildings; LL97 caps emissions, the Dutch rule sets an energy label."] },
  { a: "pol_us_nyc_ll97", b: "pol_sg_mandatory_audit", overall: 0.62, differences: ["Singapore requires periodic audits and improvement of the worst performers rather than fixed caps."] },
  { a: "pol_sg_green_mark", b: "pol_sg_gbmp_2030", overall: 0.75, differences: ["Green Mark is the certification instrument; the masterplan sets the national 80-80-80 targets it feeds."] },
  { a: "pol_fr_maprimerenov", b: "pol_nl_isde", overall: 0.77, differences: ["Both are national grant schemes covering heat pumps and insulation."] },
  { a: "pol_fr_eco_ptz", b: "pol_nl_warmtefonds", overall: 0.86, differences: ["Both are subsidised/zero-interest loan schemes for home energy renovation."] },
  { a: "pol_fr_eco_ptz", b: "pol_de_kfw_effizienzhaus", overall: 0.8, differences: ["Both used concessional finance for renovation; KfW tied repayment bonuses to performance levels."] },
  { a: "pol_gb_warm_homes_plan", b: "pol_de_beg", overall: 0.65, differences: ["The Warm Homes Plan is announced but not yet fully designed; BEG is established."] },
  { a: "pol_us_me_hp_target", b: "pol_gb_hp_target", overall: 0.73, differences: ["Both are national/sub-national heat-pump deployment targets; Maine pairs its target with rebates and met it early."] },
  { a: "pol_gb_rhi_domestic", b: "pol_de_map", overall: 0.74, differences: ["Both were long-running renewable-heat incentives, now superseded by newer schemes."] },
  { a: "pol_gb_fhs", b: "pol_fr_re2020", overall: 0.83, differences: ["Both are new-build standards that effectively exclude gas heating."] },
  { a: "pol_gb_fhs", b: "pol_us_ca_title24_2022", overall: 0.78, differences: ["Both set new-build baselines favouring heat pumps; Title 24 is in force, FHS still announced."] },
  { a: "pol_fr_re2020", b: "pol_us_ca_title24_2022", overall: 0.8, differences: ["Both are in-force new-build codes pushing heat pumps as the default."] },
  { a: "pol_de_behg", b: "pol_nl_energiebelasting", overall: 0.77, differences: ["Both raise the relative cost of gas versus electricity; BEHG is an explicit CO2 price, the Dutch measure a tax rebalance."] },
  { a: "pol_de_behg", b: "pol_dk_el_afgift", overall: 0.6, differences: ["Denmark cut the electricity tax rather than pricing carbon directly."] },
  { a: "pol_dk_skrotningsordning", b: "pol_no_enova_scrappage", overall: 0.85, differences: ["Both subsidise oil/gas boiler scrappage in favour of heat pumps; Denmark channels it through subscription service companies."] },
  { a: "pol_us_heehra", b: "pol_de_beg_em_2024", overall: 0.74, differences: ["Both target lower-income households with heat-pump support; HEEHRA is income-gated rebates, BEG a universal grant with income bonus."] },
  { a: "pol_us_masssave", b: "pol_gb_eco4", overall: 0.7, differences: ["Both are utility/supplier-funded efficiency programmes; Mass Save covers all households, ECO4 targets low-income."] },
  {
    a: "pol_sg_meps_ac",
    b: "pol_jp_top_runner",
    overall: 0.72,
    differences: [
      "Both cover air-conditioner efficiency.",
      "Japan sets targets at the best product on the market; Singapore sets a minimum floor plus mandatory labels.",
    ],
  },
  {
    a: "pol_cn_energy_label",
    b: "pol_in_star_labelling",
    overall: 0.80,
    differences: ["Both use mandatory graded appliance labels."],
  },
  {
    a: "pol_jp_tokyo_cap_trade",
    b: "pol_us_nyc_ll97",
    overall: 0.74,
    differences: [
      "Both cap emissions of large existing buildings.",
      "Tokyo allows trading; LL97 uses per-building limits with penalties.",
    ],
  },
  {
    a: "pol_kr_zeb",
    b: "pol_eu_epbd_2024",
    overall: 0.62,
    differences: [
      "Both push new buildings toward zero energy or emissions.",
      "Korea phases a certification mandate by building type; the EU sets a directive for member states.",
    ],
  },
  {
    a: "pol_in_ecbc",
    b: "pol_sg_green_mark",
    overall: 0.60,
    differences: [
      "Both set mandatory minimum performance for commercial buildings in cooling-dominated climates.",
      "Green Mark adds a voluntary higher rating tier.",
    ],
  },
];

export const similarities: Similarity[] = curated.map(({ a, b, overall, differences }) => {
  const pa = policyById.get(a);
  const pb = policyById.get(b);
  if (!pa || !pb) throw new Error(`Curated similarity references unknown policy: ${a} / ${b}`);
  const computed = structuredSimilarity(pa, pb, jurisdictions);
  return {
    id: `sim_${a}_${b}`,
    policy_a: a,
    policy_b: b,
    breakdown: {
      ...computed,
      overall,
      semantic: Math.min(1, Math.max(0, overall - 0.05 + (computed.semantic - 0.5) * 0.1)),
      differences,
    },
  };
});
