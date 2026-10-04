import type { CountryCode, Jurisdiction, Policy } from "@/lib/domain/schema";

export const TIMELINE_START = 2005;
export const TIMELINE_END = 2026;
/** ongoing policies bar to this year (soft fade) */
export const NOW_YEAR = 2025.8;

export interface TimelineLane {
  code: CountryCode;
  name: string;
  rows: Policy[];
}

/** Group policies into per-country lanes, rows ordered by introduced date. */
export function layoutLanes(
  policies: Policy[],
  jurisdictions: Jurisdiction[],
): TimelineLane[] {
  const jurName = new Map(jurisdictions.map((j) => [j.id, j.name]));
  const groups = new Map<CountryCode, Policy[]>();
  for (const p of policies) {
    const g = groups.get(p.country_code) ?? [];
    g.push(p);
    groups.set(p.country_code, g);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rows]) => ({
      code,
      name:
        jurisdictions.find((j) => j.country_code === code && j.level === "NATIONAL")
          ?.name ??
        jurName.get(rows[0]?.jurisdiction_id ?? "") ??
        code,
      rows: rows.sort((a, b) => a.introduced.localeCompare(b.introduced)),
    }));
}

/** "2024-02" / "2015-2025" → 2024 ; "2023–2024" (period end) handled by lastYearOf. */
export function firstYearOf(s?: string | null): number | null {
  const m = s?.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

/** last 4-digit year in a period string, e.g. "2023–2024" → 2024 */
export function lastYearOf(s?: string | null): number | null {
  const matches = s?.match(/\d{4}/g);
  return matches && matches.length ? parseInt(matches[matches.length - 1], 10) : null;
}
