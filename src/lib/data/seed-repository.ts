import type {
  CountryCode,
  Dataset,
  Evidence,
  Policy,
  TimeSeries,
} from "@/lib/domain/schema";
import { topSimilar } from "@/lib/similarity/structured";
import type {
  EvidenceStrength,
  EvidenceStrengthLabel,
  PactRepository,
  PolicyFilter,
  SearchResults,
} from "./repository";

const STRENGTH_SCORE: Record<string, number> = {
  META_ANALYSIS: 5,
  EXPERIMENTAL: 5,
  QUASI_EXPERIMENTAL: 4,
  CORRELATIONAL: 3,
  DESCRIPTIVE: 2,
  UNKNOWN: 0,
};

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  GOVERNMENT_EVALUATION: "Government evaluation",
  ACADEMIC_STUDY: "Independent academic study",
  OFFICIAL_STATISTICS: "Official statistics",
  INDUSTRY_REPORT: "Industry report",
  INSTITUTIONAL_REPORT: "Institutional report",
};

const STRENGTH_LABEL: Record<string, string> = {
  EXPERIMENTAL: "experimental",
  QUASI_EXPERIMENTAL: "quasi-experimental",
  META_ANALYSIS: "meta-analysis",
  CORRELATIONAL: "correlational",
  DESCRIPTIVE: "descriptive",
  UNKNOWN: "unknown strength",
};

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}

function haystack(fields: Array<string | undefined>): string {
  return fields.filter(Boolean).join(" ").toLowerCase();
}

function scoreTokens(tokens: string[], fields: Array<string | undefined>): number {
  const hay = haystack(fields);
  let score = 0;
  for (const t of tokens) if (hay.includes(t)) score += 1;
  return score;
}

function labelFor(score: number): EvidenceStrengthLabel {
  if (score >= 4) return "Strong";
  if (score >= 3) return "Moderate";
  if (score >= 1) return "Limited";
  return "Insufficient";
}

export class SeedRepository implements PactRepository {
  constructor(private readonly dataset: Dataset) {}

  getDataset(): Dataset {
    return this.dataset;
  }

  getPolicy(id: string): Policy | undefined {
    return this.dataset.policies.find((p) => p.id === id);
  }

  getEvidenceForPolicy(policyId: string): Evidence[] {
    return this.dataset.evidence.filter((e) => e.policy_ids.includes(policyId));
  }

  listPolicies(filter: PolicyFilter = {}): Policy[] {
    let out = this.dataset.policies;

    if (filter.countries?.length) {
      const set = new Set(filter.countries);
      out = out.filter((p) => set.has(p.country_code));
    }
    if (filter.technology_ids?.length) {
      const set = new Set(filter.technology_ids);
      out = out.filter((p) => p.technology_ids.some((t) => set.has(t)));
    }
    if (filter.mechanism_ids?.length) {
      const set = new Set(filter.mechanism_ids);
      out = out.filter((p) => p.mechanism_ids.some((m) => set.has(m)));
    }
    if (filter.year_from !== undefined) {
      const y = filter.year_from;
      out = out.filter((p) => parseInt(p.introduced.slice(0, 4), 10) >= y);
    }
    if (filter.year_to !== undefined) {
      const y = filter.year_to;
      out = out.filter((p) => parseInt(p.introduced.slice(0, 4), 10) <= y);
    }
    if (filter.status) {
      const s = filter.status;
      out = out.filter((p) => p.status === s);
    }
    if (filter.min_evidence_strength?.length) {
      const allowed = new Set(filter.min_evidence_strength);
      out = out.filter((p) =>
        this.dataset.evidence.some(
          (e) => e.policy_ids.includes(p.id) && allowed.has(e.causal_strength),
        ),
      );
    }
    if (filter.query?.trim()) {
      const tokens = tokenize(filter.query);
      out = out.filter(
        (p) =>
          scoreTokens(tokens, [
            p.name,
            p.short_name,
            p.description,
            p.incentive,
            ...p.tags,
          ]) > 0,
      );
    }
    return out;
  }

  getOutcomesForPolicy(policyId: string) {
    return this.dataset.outcomes.filter((o) => o.policy_id === policyId);
  }

  getTimeSeries(country: CountryCode, metric?: string): TimeSeries[] {
    return this.dataset.time_series.filter(
      (ts) => ts.country_code === country && (!metric || ts.metric_id === metric),
    );
  }

  getSimilar(policyId: string, n = 5) {
    return topSimilar(policyId, this.dataset, n);
  }

  searchText(q: string): SearchResults {
    const tokens = tokenize(q);
    if (tokens.length === 0) {
      return { policies: [], evidence: [], jurisdictions: [], technologies: [], mechanisms: [] };
    }

    const ranked = <T>(items: T[], fields: (item: T) => Array<string | undefined>): T[] =>
      items
        .map((item) => ({ item, score: scoreTokens(tokens, fields(item)) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.item);

    return {
      policies: ranked(this.dataset.policies, (p) => [
        p.name,
        p.short_name,
        p.description,
        p.incentive,
        ...p.tags,
      ]),
      evidence: ranked(this.dataset.evidence, (e) => [
        e.title,
        e.publisher,
        e.methodology,
        ...e.findings,
      ]),
      jurisdictions: ranked(this.dataset.jurisdictions, (j) => [
        j.name,
        j.context.housing_stock_note,
        j.context.dominant_heating,
      ]),
      technologies: ranked(this.dataset.technologies, (t) => [t.name, t.description]),
      mechanisms: ranked(this.dataset.mechanisms, (m) => [m.name, m.description, m.kind]),
    };
  }

  getEvidenceStrength(policyId: string): EvidenceStrength {
    const evs = this.getEvidenceForPolicy(policyId);
    const summary = evs.map((e) => {
      const type = EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type;
      const strength = STRENGTH_LABEL[e.causal_strength];
      return strength ? `${type} (${strength})` : type;
    });

    if (evs.length === 0) {
      return { score: 0, label: labelFor(0), summary };
    }

    const best = Math.max(...evs.map((e) => STRENGTH_SCORE[e.causal_strength] ?? 0));
    let score = best;
    if (best === 2) {
      // DESCRIPTIVE evidence only: 2 if at least two records, else 1.
      score = evs.length >= 2 ? 2 : 1;
    }
    return { score, label: labelFor(score), summary };
  }
}
