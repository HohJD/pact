import type { CountryCode, Policy } from "@/lib/domain/schema";

/**
 * Mapping from NewClimate Institute's Climate Policy Database (CPDB) into
 * PACT policies. CPDB records describe what a policy is (instrument, sector,
 * dates, source) but carry no evaluation evidence, so imported policies are
 * data_status "IMPORTED": real metadata, unreviewed, never counted as evidence.
 *
 * Data: Climate Policy Database, NewClimate Institute, CC BY-NC 4.0.
 */

export const CPDB_API = "https://climatepolicydatabase.org/api/v1/climate-policies";
export const CPDB_HOME = "https://climatepolicydatabase.org/";

/** CPDB country_iso → PACT country code (only countries PACT models). */
export const CPDB_COUNTRIES: Record<string, CountryCode> = {
  GBR: "GB",
  DEU: "DE",
  FRA: "FR",
  NLD: "NL",
  DNK: "DK",
  NOR: "NO",
  USA: "US",
  SGP: "SG",
  JPN: "JP",
  KOR: "KR",
  CHN: "CN",
  IND: "IN",
  EUE: "EU",
};

const BUILDING_SECTORS = new Set([
  "Buildings",
  "Heating and cooling",
  "Hot water and cooking",
  "Appliances",
]);

const STATUS: Record<string, Policy["status"]> = {
  "In force": "ACTIVE",
  Ended: "CLOSED",
  Superseded: "SUPERSEDED",
  Planned: "ANNOUNCED",
};

const MECHANISMS: Array<[string, RegExp]> = [
  ["mech_grant", /^(Grants and subsidies|Retirement premium)$/],
  ["mech_tax_credit", /^Tax relief$/],
  ["mech_loan", /^Loans$/],
  ["mech_obligation", /^(Obligation schemes|White certificates)$/],
  [
    "mech_standard",
    /^(Codes and standards|Building codes and standards|Product standards|Sectoral standards)$/,
  ],
  ["mech_carbon_price", /^(Energy and other taxes|CO2 taxes|GHG emissions allowances)$/],
  [
    "mech_information",
    /^(Information provision|Information and education|Performance label|Comparison label|Endorsement label|Advice or aid in implementation|Auditing)$/,
  ],
  [
    "mech_direct_investment",
    /^(Direct investment|Infrastructure investments|Procurement rules|Funds to sub-national governments)$/,
  ],
  ["mech_target", /target$/i],
];

const TECHNOLOGIES: Array<[string, RegExp]> = [
  ["tech_heat_pump", /heat[- ]pump/i],
  ["tech_insulation", /insulat|thermal envelope|building envelope/i],
  ["tech_district_heating", /district heat|heat network/i],
  ["tech_solar_thermal", /solar (thermal|water heat|hot water)/i],
  ["tech_smart_controls", /smart (meter|thermostat|control)|energy management system/i],
  ["tech_whole_house_retrofit", /retrofit|renovat|refurbish/i],
  ["tech_green_building", /green building|zero[- ](energy|emission|carbon) building|passive house|nearly zero/i],
  ["tech_efficient_appliances", /appliance|lighting|light bulb/i],
];

export interface CpdbRow {
  policy_id: string | number;
  country_iso: string;
  policy_title?: string | null;
  policy_name?: string | null;
  jurisdiction?: string | null;
  policy_instrument?: string | null;
  sector?: string | null;
  policy_description?: string | null;
  policy_status?: string | null;
  decision_date?: string | number | null;
  start_date?: string | number | null;
  end_date?: string | number | null;
  high_impact?: string | null;
  policy_objective?: string | null;
  reference?: string | null;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Strip markup and entities CPDB leaves in its text fields. */
export function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|nbsp|#0?39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

const list = (v: unknown) =>
  cleanText(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** First 4-digit year in a CPDB date field ("2022", "2022.0", "2022-01-01"). */
export function cpdbYear(v: unknown): string | null {
  const m = cleanText(v).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

/** Real URLs listed in a CPDB reference field; never invents one. */
export function referenceUrls(reference: unknown): string[] {
  const raw = String(reference ?? "").replace(/&amp;/g, "&");
  const out: string[] = [];
  for (const m of raw.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    try {
      const u = new URL(m[0].replace(/[.,;)]+$/, ""));
      if (!out.includes(u.href)) out.push(u.href);
    } catch {
      /* not a URL */
    }
  }
  return out.slice(0, 2);
}

export function isBuildingPolicy(row: CpdbRow): boolean {
  return list(row.sector).some((s) => BUILDING_SECTORS.has(s));
}

/** Map one CPDB row to a PACT policy, or null when it can't be placed honestly. */
export function mapCpdbRow(row: CpdbRow): Policy | null {
  const country = CPDB_COUNTRIES[row.country_iso];
  if (!country) return null;
  // sub-national CPDB rows rarely match a PACT jurisdiction; don't misattribute them
  if (row.jurisdiction && row.jurisdiction !== "Country") return null;
  const status = STATUS[cleanText(row.policy_status)];
  if (!status) return null;
  const introduced = cpdbYear(row.start_date) ?? cpdbYear(row.decision_date);
  if (!introduced) return null;
  const name = cleanText(row.policy_title) || cleanText(row.policy_name);
  if (!name) return null;

  const instruments = list(row.policy_instrument);
  const sectors = list(row.sector);
  const description = cleanText(row.policy_description);
  const haystack = `${name} ${description}`;

  const mechanism_ids = MECHANISMS.filter(([, re]) => instruments.some((i) => re.test(i))).map(
    ([id]) => id,
  );
  // CPDB sector tags are broad (most building records also list "Appliances"),
  // so technologies come from the policy's own name and description only
  const technology_ids = TECHNOLOGIES.filter(([, re]) => re.test(haystack)).map(([id]) => id);

  const ended =
    status === "CLOSED" || status === "SUPERSEDED" ? cpdbYear(row.end_date) : null;

  const tags = ["cpdb"];
  if (cleanText(row.high_impact) === "High") tags.push("high-impact");

  return {
    id: `pol_cpdb_${row.policy_id}`,
    name,
    jurisdiction_id: country === "EU" ? "jur_eu" : `jur_${country.toLowerCase()}`,
    country_code: country,
    status,
    introduced,
    ended,
    sector: "ALL_BUILDINGS",
    technology_ids,
    mechanism_ids,
    target_groups: [],
    eligibility: "",
    incentive: "",
    funding: "",
    objectives: list(row.policy_objective),
    description:
      description ||
      `Recorded in the Climate Policy Database as ${instruments.join(", ").toLowerCase() || "a policy"} covering ${sectors.join(", ").toLowerCase()}.`,
    limitations: [],
    sources: [
      { label: "Climate Policy Database", url: CPDB_HOME, publisher: "NewClimate Institute" },
      ...referenceUrls(row.reference).map((url) => ({
        label: `Original source (${new URL(url).hostname.replace(/^www\./, "")})`,
        url,
        publisher: new URL(url).hostname.replace(/^www\./, ""),
      })),
    ],
    data_status: "IMPORTED",
    tags,
  };
}

const STOP = new Set([
  "the", "of", "and", "for", "in", "on", "to", "a", "an", "act", "programme", "program",
  "scheme", "plan", "policy", "national", "law", "regulation", "ordinance",
]);

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOP.has(t))
      .map((t) => (t.length > 3 ? t.replace(/s$/, "") : t)), // "standards" ≈ "standard"
  );

/** Acronyms in parentheses, e.g. "Fuel Emissions Trading Act (BEHG)" → ["behg"]. */
const acronyms = (s: string) =>
  [...s.matchAll(/\(([A-Za-z0-9-]{2,10})\)/g)].map((m) => m[1].replace(/-/g, "").toLowerCase());

/**
 * Whether an imported title names the same policy as a curated one: strong
 * token overlap, or every word of a 3+ word imported title appears in the
 * (usually longer, more descriptive) curated name.
 */
export function sameTitle(imported: string, curatedName: string): boolean {
  const ti = tokens(imported);
  const tc = tokens(curatedName);
  if (!ti.size || !tc.size) return false;
  let shared = 0;
  for (const t of ti) if (tc.has(t)) shared++;
  const jaccard = shared / (ti.size + tc.size - shared);
  return (shared >= 2 && jaccard >= 0.5) || (ti.size >= 3 && shared === ti.size);
}

const year = (s: string) => parseInt(s.slice(0, 4), 10);

/** Curated policy that an imported one duplicates, if any. */
export function findCuratedDuplicate(p: Policy, curated: Policy[]): Policy | null {
  for (const c of curated) {
    if (c.country_code !== p.country_code) continue;
    // successive versions (e.g. the 2010 vs 2024 EPBD) are different policies
    if (Math.abs(year(c.introduced) - year(p.introduced)) > 3) continue;
    const names = [c.name, c.short_name].filter((n): n is string => !!n);
    if (names.some((n) => sameTitle(p.name, n))) return c;
    const short = c.short_name?.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    if (short && short.length >= 3 && acronyms(p.name).includes(short)) return c;
  }
  return null;
}

/** Same title within a country (e.g. successive building codes) → suffix the year. */
export function disambiguateNames(policies: Policy[]): Policy[] {
  const count = new Map<string, number>();
  for (const p of policies) {
    const k = `${p.country_code}|${p.name.toLowerCase()}`;
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  return policies.map((p) =>
    (count.get(`${p.country_code}|${p.name.toLowerCase()}`) ?? 0) > 1
      ? { ...p, name: `${p.name} (${p.introduced})` }
      : p,
  );
}
