import type {
  AnalystResponse,
  Claim,
  Dataset,
  Evidence,
  UIAction,
} from "@/lib/domain/schema";
import type { RetrievalContext } from "./retrieval";

const CAUSAL_WORDS =
  /\b(caused|led to|drove|resulted in|increased|reduced|boosted)\b/i;
const CAUSAL_STRENGTHS = new Set([
  "EXPERIMENTAL",
  "QUASI_EXPERIMENTAL",
  "META_ANALYSIS",
]);

/**
 * Post-validate model output against the retrieved context. Never silently
 * accepts: unknown citations are dropped, causal wording without causal
 * evidence is rewritten to UNCERTAIN, DEMO citations are labelled.
 */
export function guardAnalystResponse(
  response: Omit<AnalystResponse, "source">,
  ctx: RetrievalContext,
  dataset: Dataset,
): Omit<AnalystResponse, "source"> {
  const evById = new Map(dataset.evidence.map((e) => [e.id, e]));
  const outById = new Map(dataset.outcomes.map((o) => [o.id, o]));

  const claims: Claim[] = response.claims.map((c) => {
    // models often cite an outcome id — resolve it to the evidence behind it
    const resolved = c.evidence_ids.flatMap((id) => outById.get(id)?.evidence_ids ?? [id]);
    const ids = [...new Set(resolved)].filter((id) => ctx.evidenceIds.has(id));
    let text = c.text;
    let inference_type = c.inference_type;

    if (c.evidence_ids.length > 0 && ids.length === 0 && inference_type !== "UNCERTAIN") {
      inference_type = "INFERRED";
    }

    const cited = ids
      .map((id) => evById.get(id))
      .filter((e): e is Evidence => !!e);

    // causal wording only with causal evidence
    if (
      CAUSAL_WORDS.test(text) &&
      !cited.some((e) => CAUSAL_STRENGTHS.has(e.causal_strength))
    ) {
      inference_type = "UNCERTAIN";
      if (!text.startsWith("[Correlational]")) text = `[Correlational] ${text}`;
    }

    // DEMO citations must be labelled
    if (cited.some((e) => e.data_status === "DEMO") && !/demo record/i.test(text)) {
      text = `${text} (demo record)`;
    }

    return { ...c, text, evidence_ids: ids, inference_type };
  });

  const citations = [...new Set(claims.flatMap((c) => c.evidence_ids))];

  const actions = response.actions.filter((a) => actionIdsKnown(a, ctx, dataset));

  return { ...response, claims, citations, actions };
}

function actionIdsKnown(
  a: UIAction,
  ctx: RetrievalContext,
  dataset: Dataset,
): boolean {
  const policyOk = (id: string) =>
    ctx.policyIds.has(id) || dataset.policies.some((p) => p.id === id);
  const entityOk = (id: string) =>
    ctx.policyIds.has(id) ||
    dataset.policies.some((p) => p.id === id) ||
    dataset.jurisdictions.some((j) => j.id === id) ||
    dataset.technologies.some((t) => t.id === id) ||
    dataset.mechanisms.some((m) => m.id === id) ||
    dataset.evidence.some((e) => e.id === id);

  switch (a.type) {
    case "OPEN_POLICY":
    case "SHOW_OUTCOMES":
      return !a.policy_id || policyOk(a.policy_id);
    case "SHOW_EVIDENCE":
      return (
        (!a.policy_id || policyOk(a.policy_id)) &&
        (!a.evidence_id || ctx.evidenceIds.has(a.evidence_id))
      );
    case "COMPARE_POLICIES":
      return a.policy_ids.every(policyOk);
    case "HIGHLIGHT_NODES":
      return a.node_ids.every(entityOk);
    default:
      return true;
  }
}
