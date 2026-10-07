import MiniSearch from "minisearch";

import type {
  Dataset,
  Evidence,
  Jurisdiction,
  Mechanism,
  Policy,
  Technology,
} from "@/lib/domain/schema";
import type { SearchResults } from "@/lib/data/repository";

const STOP = new Set(
  "the a an and or of to in for on with by is are was were be been what which how have has do does did it its that this from as at not no but can could should would will".split(
    " ",
  ),
);

export function processTerm(term: string): string | null {
  const normalized = term.toLowerCase();
  if (normalized.length <= 1 || STOP.has(normalized)) return null;
  return normalized.length > 3 && normalized.endsWith("s")
    ? normalized.slice(0, -1)
    : normalized;
}

export const SEARCH_OPTIONS = {
  prefix: true,
  fuzzy: (term: string) => (term.length > 4 ? 0.2 : false),
  combineWith: "OR" as const,
};

const CATALOGUE_SEARCH_OPTIONS = {
  ...SEARCH_OPTIONS,
  boost: {
    name: 3,
    short_name: 3,
    title: 3,
    tags: 2,
    jurisdiction_name: 2,
  },
};

type EntityKind =
  | "policy"
  | "evidence"
  | "jurisdiction"
  | "technology"
  | "mechanism";

interface CatalogueDocument {
  documentId: string;
  kind: EntityKind;
  entityId: string;
  name: string;
  short_name: string;
  tags: string;
  description: string;
  incentive: string;
  eligibility: string;
  funding: string;
  objectives: string;
  implementation_notes: string;
  limitations: string;
  target_groups: string;
  jurisdiction_name: string;
  title: string;
  publisher: string;
  methodology: string;
  findings: string;
  housing_stock_note: string;
  dominant_heating: string;
  mechanism_kind: string;
}

const FIELDS = [
  "name",
  "short_name",
  "tags",
  "description",
  "incentive",
  "eligibility",
  "funding",
  "objectives",
  "implementation_notes",
  "limitations",
  "target_groups",
  "jurisdiction_name",
  "title",
  "publisher",
  "methodology",
  "findings",
  "housing_stock_note",
  "dominant_heating",
  "mechanism_kind",
] as const;

const EMPTY_FIELDS = {
  name: "",
  short_name: "",
  tags: "",
  description: "",
  incentive: "",
  eligibility: "",
  funding: "",
  objectives: "",
  implementation_notes: "",
  limitations: "",
  target_groups: "",
  jurisdiction_name: "",
  title: "",
  publisher: "",
  methodology: "",
  findings: "",
  housing_stock_note: "",
  dominant_heating: "",
  mechanism_kind: "",
};

const INDEX_OPTIONS = {
  idField: "documentId",
  fields: [...FIELDS],
  storeFields: ["kind", "entityId"],
  processTerm,
  searchOptions: SEARCH_OPTIONS,
};

interface CatalogueIndex {
  index: MiniSearch<CatalogueDocument>;
  policies: Map<string, Policy>;
  evidence: Map<string, Evidence>;
  jurisdictions: Map<string, Jurisdiction>;
  technologies: Map<string, Technology>;
  mechanisms: Map<string, Mechanism>;
}

const indexes = new WeakMap<Dataset, CatalogueIndex>();

function text(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(" ") : value ?? "";
}

function createDocument(
  kind: EntityKind,
  entityId: string,
  fields: Partial<CatalogueDocument>,
): CatalogueDocument {
  return {
    documentId: `${kind}:${entityId}`,
    kind,
    entityId,
    ...EMPTY_FIELDS,
    ...fields,
  };
}

function buildIndex(dataset: Dataset): CatalogueIndex {
  const policies = new Map(dataset.policies.map((p) => [p.id, p]));
  const evidence = new Map(dataset.evidence.map((e) => [e.id, e]));
  const jurisdictions = new Map(dataset.jurisdictions.map((j) => [j.id, j]));
  const technologies = new Map(dataset.technologies.map((t) => [t.id, t]));
  const mechanisms = new Map(dataset.mechanisms.map((m) => [m.id, m]));
  const nationalJurisdictions = new Map(
    dataset.jurisdictions
      .filter((j) => j.level === "NATIONAL")
      .map((j) => [j.country_code, j.name]),
  );

  const documents: CatalogueDocument[] = [
    ...dataset.policies.map((p) => {
      const jurisdiction = jurisdictions.get(p.jurisdiction_id);
      const national = nationalJurisdictions.get(p.country_code);
      return createDocument("policy", p.id, {
        name: p.name,
        short_name: p.short_name ?? "",
        tags: text(p.tags),
        description: p.description,
        incentive: p.incentive,
        eligibility: p.eligibility,
        funding: p.funding,
        objectives: text(p.objectives),
        implementation_notes: p.implementation_notes ?? "",
        limitations: text(p.limitations),
        target_groups: text(p.target_groups),
        jurisdiction_name: [jurisdiction?.name, national]
          .filter((name, i, names): name is string => Boolean(name) && names.indexOf(name) === i)
          .join(" "),
      });
    }),
    ...dataset.evidence.map((e) =>
      createDocument("evidence", e.id, {
        title: e.title,
        publisher: e.publisher,
        methodology: e.methodology,
        findings: text(e.findings),
        limitations: text(e.limitations),
      }),
    ),
    ...dataset.jurisdictions.map((j) =>
      createDocument("jurisdiction", j.id, {
        name: j.name,
        housing_stock_note: j.context.housing_stock_note ?? "",
        dominant_heating: j.context.dominant_heating ?? "",
      }),
    ),
    ...dataset.technologies.map((t) =>
      createDocument("technology", t.id, {
        name: t.name,
        description: t.description,
      }),
    ),
    ...dataset.mechanisms.map((m) =>
      createDocument("mechanism", m.id, {
        name: m.name,
        description: m.description,
        mechanism_kind: m.kind,
      }),
    ),
  ];

  const index = new MiniSearch<CatalogueDocument>(INDEX_OPTIONS);
  index.addAll(documents);

  return { index, policies, evidence, jurisdictions, technologies, mechanisms };
}

export function searchCatalogue(
  dataset: Dataset,
  q: string,
): SearchResults & { scores: Map<string, number> } {
  const results: SearchResults & { scores: Map<string, number> } = {
    policies: [],
    evidence: [],
    jurisdictions: [],
    technologies: [],
    mechanisms: [],
    scores: new Map(),
  };
  if (!q.trim()) return results;

  let cached = indexes.get(dataset);
  if (!cached) {
    cached = buildIndex(dataset);
    indexes.set(dataset, cached);
  }

  for (const hit of cached.index.search(q.trim(), CATALOGUE_SEARCH_OPTIONS)) {
    switch (hit.kind as EntityKind) {
      case "policy": {
        const policy = cached.policies.get(hit.entityId as string);
        if (policy) {
          results.policies.push(policy);
          results.scores.set(policy.id, hit.score);
        }
        break;
      }
      case "evidence": {
        const item = cached.evidence.get(hit.entityId as string);
        if (item) results.evidence.push(item);
        break;
      }
      case "jurisdiction": {
        const item = cached.jurisdictions.get(hit.entityId as string);
        if (item) results.jurisdictions.push(item);
        break;
      }
      case "technology": {
        const item = cached.technologies.get(hit.entityId as string);
        if (item) results.technologies.push(item);
        break;
      }
      case "mechanism": {
        const item = cached.mechanisms.get(hit.entityId as string);
        if (item) results.mechanisms.push(item);
        break;
      }
    }
  }

  return results;
}
