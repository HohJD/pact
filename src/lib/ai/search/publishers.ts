/**
 * Publisher classification for web-search evidence candidates.
 *
 * A hit's `evidence_type` may claim OFFICIAL_STATISTICS or GOVERNMENT_EVALUATION
 * only when the hostname is a government/public-body domain — otherwise it is
 * downgraded to match the publisher class. Deterministic post-processing, not
 * a prompt rule.
 */

export type PublisherClass = "GOVERNMENT" | "ACADEMIC" | "INSTITUTIONAL" | "OTHER";

const GOV_PATTERNS: RegExp[] = [
  /gov\.[a-z]{2}$/, // gov.uk, x.gov.uk, gov.sg …
  /\.gov$/, // energy.gov, cdc.gov …
  /\.gouv\.fr$/,
  /\.bund\.de$/,
  /europa\.eu$/,
  /\.gov\.sg$/,
  /(^|\.)ons\.gov\.uk$/,
  /(^|\.)nao\.org\.uk$/,
  /(^|\.)theccc\.org\.uk$/,
  /(^|\.)parliament\.uk$/,
  /(^|\.)ofgem\.gov\.uk$/,
  /(^|\.)ens\.dk$/,
  /(^|\.)ssb\.no$/,
  /(^|\.)cbs\.nl$/,
  /(^|\.)rvo\.nl$/,
  /(^|\.)kfw\.de$/,
  /(^|\.)bafa\.de$/,
  /(^|\.)enova\.no$/,
  /(^|\.)ademe\.fr$/,
  /(^|\.)anah\.gouv\.fr$/,
  /(^|\.)bca\.gov\.sg$/,
  /(^|\.)nea\.gov\.sg$/,
  /(^|\.)energy\.gov$/,
  /(^|\.)irs\.gov$/,
  /(^|\.)eia\.gov$/,
];

const ACADEMIC_PATTERNS: RegExp[] = [
  /(^|\.)doi\.org$/,
  /(^|\.)nature\.com$/,
  /(^|\.)sciencedirect\.com$/,
  /(^|\.)springer\./,
  /(^|\.)wiley\./,
  /\.ac\.uk$/,
  /\.edu$/,
  /(^|\.)nber\.org$/,
  /(^|\.)ssrn\.com$/,
];

const INSTITUTIONAL_PATTERNS: RegExp[] = [
  /(^|\.)iea\.org$/,
  /(^|\.)ehpa\.org$/,
  /(^|\.)agora-energiewende\.de$/,
  /(^|\.)oecd\.org$/,
  /(^|\.)worldbank\.org$/,
  /(^|\.)irena\.org$/,
  /(^|\.)e3g\.org$/,
  /(^|\.)rap\.org$/,
  /(^|\.)regulatoryassistance/,
];

/** Short display labels for well-known government/public hosts. */
const GOV_LABELS: Record<string, string> = {
  "gov.uk": "GOV.UK (HM Government)",
  "ons.gov.uk": "ONS (UK)",
  "nao.org.uk": "National Audit Office (UK)",
  "theccc.org.uk": "Climate Change Committee (UK)",
  "parliament.uk": "UK Parliament",
  "ofgem.gov.uk": "Ofgem (UK)",
  "desnz.gov.uk": "DESNZ (UK)",
  "gouv.fr": "French Government",
  "anah.gouv.fr": "Anah (France)",
  "ademe.fr": "ADEME (France)",
  "bund.de": "German Federal Government",
  "bafa.de": "BAFA (Germany)",
  "kfw.de": "KfW (Germany)",
  "europa.eu": "European Union",
  "ens.dk": "Danish Energy Agency",
  "ssb.no": "Statistics Norway",
  "enova.no": "Enova (Norway)",
  "cbs.nl": "CBS (Netherlands)",
  "rvo.nl": "RVO (Netherlands)",
  "bca.gov.sg": "BCA (Singapore)",
  "nea.gov.sg": "NEA (Singapore)",
  "gov.sg": "Singapore Government",
  "energy.gov": "US DOE",
  "irs.gov": "IRS (US)",
  "eia.gov": "EIA (US)",
};

export function classifyHost(host: string): PublisherClass {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (GOV_PATTERNS.some((re) => re.test(h))) return "GOVERNMENT";
  if (ACADEMIC_PATTERNS.some((re) => re.test(h))) return "ACADEMIC";
  if (INSTITUTIONAL_PATTERNS.some((re) => re.test(h))) return "INSTITUTIONAL";
  return "OTHER";
}

/** Short display name for a government host; falls back to the hostname. */
export function govLabel(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [key, label] of Object.entries(GOV_LABELS)) {
    if (h === key || h.endsWith(`.${key}`)) return label;
  }
  return host;
}
