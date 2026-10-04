import { SeedRepository } from "@/lib/data/seed-repository";
import type { CountryCode, Dataset, Jurisdiction, Policy } from "@/lib/domain/schema";
import type { WorkspaceFilter } from "@/store/workspace";

export interface CountryMapDatum {
  code: CountryCode;
  name: string;
  count: number;
  /** 0–1, count / max across visible countries */
  intensity: number;
  policies: Policy[];
  jurisdictions: Jurisdiction[];
}

export interface MapMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
  jurisdictionId: string;
  kind: "SUBNATIONAL" | "EU" | "POINT";
}

export interface MapData {
  countries: Map<CountryCode, CountryMapDatum>;
  markers: MapMarker[];
  maxCount: number;
  totalPolicies: number;
}

/** Policies in view under the current filters — same set buildGraph renders. */
export function policiesInView(dataset: Dataset, filters: WorkspaceFilter): Policy[] {
  const repo = new SeedRepository(dataset);
  const { evidence_strength_min, ...policyFilter } = filters;
  let policies = repo.listPolicies(policyFilter);
  if (evidence_strength_min !== undefined && evidence_strength_min > 0) {
    policies = policies.filter(
      (p) => repo.getEvidenceStrength(p.id).score >= evidence_strength_min,
    );
  }
  return policies;
}

/**
 * Per-country counts + marker list for the map. EU is a marker (Brussels),
 * never a choropleth fill; Singapore is always a marker (too small to see).
 */
export function computeMapData(dataset: Dataset, filters: WorkspaceFilter): MapData {
  const policies = policiesInView(dataset, filters);
  const jurById = new Map(dataset.jurisdictions.map((j) => [j.id, j]));

  interface Acc {
    code: CountryCode;
    count: number;
    policies: Policy[];
    jurs: Map<string, Jurisdiction>;
  }
  const acc = new Map<CountryCode, Acc>();
  for (const p of policies) {
    const jur = jurById.get(p.jurisdiction_id);
    const cur: Acc = acc.get(p.country_code) ?? {
      code: p.country_code,
      count: 0,
      policies: [] as Policy[],
      jurs: new Map<string, Jurisdiction>(),
    };
    cur.count++;
    cur.policies.push(p);
    if (jur) cur.jurs.set(jur.id, jur);
    acc.set(p.country_code, cur);
  }

  const maxCount = Math.max(1, ...[...acc.values()].map((d) => d.count));
  const countries = new Map<CountryCode, CountryMapDatum>();
  for (const [code, d] of acc) {
    const jurs = [...d.jurs.values()];
    const national =
      jurs.find((j) => j.level === "NATIONAL" || j.level === "SUPRANATIONAL") ??
      dataset.jurisdictions.find(
        (j) => j.country_code === code && j.level === "NATIONAL",
      );
    countries.set(code, {
      code,
      name: national?.name ?? code,
      count: d.count,
      intensity: d.count / maxCount,
      policies: d.policies,
      jurisdictions: jurs,
    });
  }

  // markers: sub-national jurisdictions with policies in view, Singapore, EU
  const markers: MapMarker[] = [];
  const subnational = new Map<string, MapMarker>();
  for (const p of policies) {
    const jur = jurById.get(p.jurisdiction_id);
    if (!jur || jur.level === "NATIONAL" || jur.level === "SUPRANATIONAL") continue;
    const m = subnational.get(jur.id) ?? {
      id: jur.id,
      label: jur.name,
      lat: jur.lat,
      lng: jur.lng,
      count: 0,
      jurisdictionId: jur.id,
      kind: "SUBNATIONAL" as const,
    };
    m.count++;
    subnational.set(jur.id, m);
  }
  markers.push(...subnational.values());

  const sg = countries.get("SG");
  if (sg) {
    const jur = dataset.jurisdictions.find((j) => j.country_code === "SG");
    markers.push({
      id: "jur_sg",
      label: "Singapore",
      lat: jur?.lat ?? 1.35,
      lng: jur?.lng ?? 103.8,
      count: sg.count,
      jurisdictionId: jur?.id ?? "jur_sg",
      kind: "POINT",
    });
  }

  const eu = countries.get("EU");
  if (eu) {
    markers.push({
      id: "jur_eu",
      label: "EU",
      lat: 50.85,
      lng: 4.35,
      count: eu.count,
      jurisdictionId:
        dataset.jurisdictions.find((j) => j.country_code === "EU")?.id ?? "jur_eu",
      kind: "EU",
    });
  }

  return { countries, markers, maxCount, totalPolicies: policies.length };
}
