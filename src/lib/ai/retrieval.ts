import type { Dataset, Evidence, Outcome, Policy } from "@/lib/domain/schema";
import type { WorkspaceFilter } from "@/store/workspace";
import { resolveQuery } from "@/lib/query/resolve";
import { searchCatalogue } from "@/lib/search/catalogue";
import { cosine, loadEmbeddings, rankPolicies } from "@/lib/search/rank";
import type { LLMProvider } from "./provider";

export interface WorkspaceContext {
  selectedPolicyIds?: string[];
  focusedCountry?: string | null;
  compareIds?: string[];
  filters?: WorkspaceFilter;
}

export interface RetrievalContext {
  question: string;
  intent: string;
  policies: Policy[];
  evidence: Evidence[];
  outcomes: Outcome[];
  timeSeries: Dataset["time_series"];
  similarities: Dataset["similarities"];
  jurisdictions: Dataset["jurisdictions"];
  /** evidence ids present in context — the citation allow-list */
  evidenceIds: Set<string>;
  policyIds: Set<string>;
}

export async function retrieveContext(
  question: string,
  dataset: Dataset,
  workspace?: WorkspaceContext,
  provider?: LLMProvider,
): Promise<RetrievalContext> {
  const resolved = resolveQuery(question, dataset);
  const catalogueResults = searchCatalogue(dataset, question);
  let documentPolicyIds = new Set<string>();
  try {
    const { searchDocuments } = await import("@/lib/search/documents");
    const documents = await searchDocuments(question, 10);
    documentPolicyIds = new Set(documents.map((document) => document.policy_id));
  } catch {
    documentPolicyIds = new Set();
  }

  const hintTech = new Set(resolved.filters.technology_ids ?? []);
  const hintMech = new Set(resolved.filters.mechanism_ids ?? []);
  const hintCountry = new Set(resolved.filters.countries ?? []);
  const pinned = new Set([
    ...(workspace?.selectedPolicyIds ?? []),
    ...(workspace?.compareIds ?? []),
  ]);

  // optional embedding blend
  let emb: Record<string, number> | null = null;
  const embFile = provider?.isConfigured() ? loadEmbeddings() : null;
  if (provider?.isConfigured() && embFile) {
    try {
      const [qv] = await provider.embed([question]);
      if (qv?.length) {
        const compatible = Object.entries(embFile.policies).filter(
          ([, vector]) => vector.length === qv.length,
        );
        if (compatible.length > 0) {
          emb = Object.fromEntries(
            compatible.map(([id, vector]) => [id, cosine(qv, vector)]),
          );
        }
      }
    } catch {
      emb = null; // embeddings unavailable → lexical only
    }
  }

  const scored = rankPolicies(question, dataset, {
    lexicalScores: catalogueResults.scores,
    hintTechnologyIds: hintTech,
    hintMechanismIds: hintMech,
    hintCountries: hintCountry,
    pinnedPolicyIds: pinned,
    documentPolicyIds,
    emb,
  });
  const top = scored.slice(0, 12).map((s) => s.policy);
  // always include selected/compared policies
  for (const id of pinned) {
    const p = dataset.policies.find((x) => x.id === id);
    if (p && !top.includes(p)) top.push(p);
  }

  const policyIds = new Set(top.map((p) => p.id));
  const evidence = dataset.evidence
    .filter((e) => e.policy_ids.some((id) => policyIds.has(id)))
    .slice(0, 20);
  const outcomes = dataset.outcomes.filter((o) => policyIds.has(o.policy_id));
  const countries = new Set(top.map((p) => p.country_code));
  const metricIds = new Set(outcomes.map((o) => o.metric_id));
  const timeSeries = dataset.time_series.filter(
    (t) => countries.has(t.country_code) && (metricIds.size === 0 || metricIds.has(t.metric_id)),
  );
  const similarities = dataset.similarities.filter(
    (s) => policyIds.has(s.policy_a) && policyIds.has(s.policy_b),
  );
  const jurisdictionIds = new Set(top.map((p) => p.jurisdiction_id));
  const jurisdictions = dataset.jurisdictions.filter((j) => jurisdictionIds.has(j.id));

  return {
    question,
    intent: resolved.intent,
    policies: top,
    evidence,
    outcomes,
    timeSeries,
    similarities,
    jurisdictions,
    evidenceIds: new Set(evidence.map((e) => e.id)),
    policyIds,
  };
}

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Compact plain-text context document for the analyst (~12k tokens budget). */
export function formatContextDocument(
  ctx: RetrievalContext,
  dataset: Dataset,
): string {
  const mech = (id: string) => dataset.mechanisms.find((m) => m.id === id)?.name ?? id;
  const tech = (id: string) => dataset.technologies.find((t) => t.id === id)?.name ?? id;
  const metric = (id: string) => dataset.metrics.find((m) => m.id === id)?.name ?? id;

  const lines: string[] = [];

  lines.push("JURISDICTIONS");
  for (const j of ctx.jurisdictions)
    lines.push(
      `- ${j.id} | ${j.name} (${j.country_code}, ${j.level}) | heating: ${j.context.dominant_heating}; owner-occupier ${j.context.owner_occupier_share}; elec/gas price ratio ${j.context.electricity_gas_price_ratio} | ${trunc(j.context.housing_stock_note ?? "", 300)}`,
    );

  lines.push("", "POLICIES");
  for (const p of ctx.policies)
    lines.push(
      `- ${p.id} | ${p.name} | ${p.country_code} | ${p.status} | introduced ${p.introduced}${p.ended ? `, ended ${p.ended}` : ""} | mechanisms: ${p.mechanism_ids.map(mech).join(", ")} | technologies: ${p.technology_ids.map(tech).join(", ")} | incentive: ${trunc(p.incentive, 200)} | data_status ${p.data_status} | ${trunc(p.description, 400)}`,
    );

  lines.push("", "EVIDENCE");
  for (const e of ctx.evidence)
    lines.push(
      [
        `- ${e.id} | ${trunc(e.title, 140)} | ${e.publisher} ${e.publication_date} | ${e.evidence_type} | causal_strength ${e.causal_strength} | relevance ${e.policy_relevance} | confidence ${e.confidence} | data_status ${e.data_status}`,
        `  findings: ${e.findings.map((f) => trunc(f, 220)).join(" | ")}`,
        e.limitations.length ? `  limitations: ${e.limitations.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

  lines.push("", "OUTCOMES");
  for (const o of ctx.outcomes)
    lines.push(
      `- ${o.id} | policy ${o.policy_id} | ${o.headline} | ${o.magnitude ?? ""} ${o.period} | inference ${o.inference} | evidence ${o.evidence_ids.join(", ")}${o.note ? ` | ${trunc(o.note, 200)}` : ""}`,
    );

  lines.push("", "TIME SERIES");
  for (const t of ctx.timeSeries)
    lines.push(
      `- ${t.id} | ${metric(t.metric_id)} | ${t.country_code} | precision ${t.precision} | data_status ${t.data_status} | ${t.points.map((p) => `${p.year}:${p.value}`).join(" ")}${t.note ? ` | ${t.note}` : ""}`,
    );

  if (ctx.similarities.length) {
    lines.push("", "SIMILARITIES");
    for (const s of ctx.similarities)
      lines.push(
        `- ${s.policy_a} ~ ${s.policy_b} | overall ${s.breakdown.overall} | ${s.breakdown.differences.join("; ")}`,
      );
  }

  return lines.join("\n");
}
