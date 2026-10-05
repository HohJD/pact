import type { CountryCode, Dataset } from "@/lib/domain/schema";
import type { WorkspaceFilter } from "@/store/workspace";

export type QueryIntent = "EXPLORE" | "COMPARE" | "OUTCOMES" | "EVIDENCE" | "TRANSFER";

export interface ResolvedQuery {
  filters: WorkspaceFilter;
  highlightTechnologyIds: string[];
  highlightCountries: CountryCode[];
  intent: QueryIntent;
}

const TECHNOLOGY_KEYWORDS: Array<[RegExp, string]> = [
  [/\bheat[\s-]?pumps?\b/i, "tech_heat_pump"],
  [/\binsulat|retrofit|weatheri[sz]ation|fabric\b/i, "tech_insulation"],
  [/\bwhole[\s-]?house|deep retrofit\b/i, "tech_whole_house_retrofit"],
  [/\bdistrict heat|heat network\b/i, "tech_district_heating"],
  [/\bsolar thermal\b/i, "tech_solar_thermal"],
  [/\bsmart (controls?|meter)|thermostat\b/i, "tech_smart_controls"],
  [/\bgreen building|new build|building code\b/i, "tech_green_building"],
  [/\bappliance|cooling|air[\s-]?condition/i, "tech_efficient_appliances"],
];

const MECHANISM_KEYWORDS: Array<[RegExp, string]> = [
  [/\bloans?\b|zero[\s-]?interest|concessional/i, "mech_loan"],
  [/\bsubsid|grants?|rebates?|vouchers?|incentives?\b/i, "mech_grant"],
  [/\btax credits?\b/i, "mech_tax_credit"],
  [/\blobligations?\b|supplier obligation|white certificate/i, "mech_obligation"],
  [/\bbans?\b|phase[\s-]?out|prohibit/i, "mech_ban"],
  [/\bstandards?\b|building code|regulation|meps\b/i, "mech_standard"],
  [/\bcarbon (price|tax)|energy tax/i, "mech_carbon_price"],
  [/\blabels?|audit|advice|information|certificat/i, "mech_information"],
  [/\btargets?\b|goal\b|commitment/i, "mech_target"],
  [/\bguarantee/i, "mech_loan_guarantee"],
  [/\bdirect (investment|delivery)|public programme/i, "mech_direct_investment"],
];

const COUNTRY_KEYWORDS: Array<[RegExp, CountryCode]> = [
  [/\buk\b|\bbrit(ain|ish)\b|united kingdom|england|scotland|wales/i, "GB"],
  [/\bgerman|germany|deutsch/i, "DE"],
  [/\bfrance|french|français/i, "FR"],
  [/\bnetherlands|dutch|holland/i, "NL"],
  [/\bdenmark|danish/i, "DK"],
  [/\bnorway|norwegian/i, "NO"],
  [/\bus\b|u\.?s\.?\b|united states|america|states?\b/i, "US"],
  [/\bsingapore/i, "SG"],
  [/\bjapan(ese)?\b|\btokyo\b/i, "JP"],
  [/\b(south )?korea(n)?\b/i, "KR"],
  [/\bchina\b|\bchinese\b/i, "CN"],
  [/\bindia(n)?\b/i, "IN"],
  [/\basia(n)?\b/i, "JP"],
  [/\basia(n)?\b/i, "KR"],
  [/\basia(n)?\b/i, "CN"],
  [/\basia(n)?\b/i, "IN"],
  [/\basia(n)?\b/i, "SG"],
  [/\beu\b|europe(an)?\b|european union|europe-wide/i, "EU"],
];

const INTENT_PATTERNS: Array<[RegExp, QueryIntent]> = [
  [/\bcompare|versus|vs\.?\b|difference between|side[\s-]?by[\s-]?side/i, "COMPARE"],
  [/\boutcomes?|what happened|effect|impact|result|after|did it work|worked/i, "OUTCOMES"],
  [/\bevidence|studies|evaluation|research|proof/i, "EVIDENCE"],
  [/\blearn from|transfer|borrow|copy|replicat|apply .* to/i, "TRANSFER"],
];

export function resolveQuery(q: string, dataset: Dataset): ResolvedQuery {
  void dataset; // keyword resolution is dataset-independent for now
  const technology_ids = new Set<string>();
  const mechanism_ids = new Set<string>();
  const countries = new Set<CountryCode>();

  for (const [re, id] of TECHNOLOGY_KEYWORDS) if (re.test(q)) technology_ids.add(id);
  for (const [re, id] of MECHANISM_KEYWORDS) if (re.test(q)) mechanism_ids.add(id);
  for (const [re, c] of COUNTRY_KEYWORDS) if (re.test(q)) countries.add(c);

  // Insulation terms also imply the retrofit technology family only when used alone;
  // keep each keyword's mapping single-purpose for predictable filters.

  let intent: QueryIntent = "EXPLORE";
  for (const [re, i] of INTENT_PATTERNS) {
    if (re.test(q)) {
      intent = i;
      break;
    }
  }

  const filters: WorkspaceFilter = {};
  if (technology_ids.size) filters.technology_ids = [...technology_ids];
  if (mechanism_ids.size) filters.mechanism_ids = [...mechanism_ids];
  if (countries.size) filters.countries = [...countries];

  return {
    filters,
    highlightTechnologyIds: [...technology_ids],
    highlightCountries: [...countries],
    intent,
  };
}
