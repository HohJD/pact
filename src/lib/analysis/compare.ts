import type { Claim, Dataset, Policy } from "@/lib/domain/schema";

/**
 * Deterministic structural diffing between compared policies.
 * Only uses fields already in the records — no external facts.
 */
export function keyDifferences(policies: Policy[], dataset: Dataset): string[] {
  const out: string[] = [];
  if (policies.length < 2) return out;

  const name = (p: Policy) => p.short_name ?? p.name;
  const mechKinds = (p: Policy) =>
    new Set(
      p.mechanism_ids
        .map((id) => dataset.mechanisms.find((m) => m.id === id)?.kind)
        .filter(Boolean) as string[],
    );

  // 1. Mechanism set differences
  const mechSets = policies.map((p) => [...mechKinds(p)].sort());
  const allSameMech = mechSets.every((s) => s.join() === mechSets[0].join());
  if (!allSameMech) {
    const parts = policies.map((p) => {
      const kinds = [...mechKinds(p)].map((k) => k.toLowerCase().replace(/_/g, " "));
      return `${name(p)} uses ${kinds.join(" + ") || "no scored mechanism"}`;
    });
    out.push(`**Mechanism mix.** ${parts.join("; ")}.`);
  }

  // imported (CPDB) records carry no eligibility, targeting or incentive
  // detail, so they are left out of comparisons that would read absence as fact
  const detailed = policies.filter((p) => p.data_status !== "IMPORTED");

  // 2. Targeting: income-banded vs universal
  const isIncomeTargeted = (p: Policy) =>
    /income|low-income|moderate-income|means-tested/i.test(
      `${p.incentive} ${p.eligibility} ${p.target_groups.join(" ")}`,
    );
  const incomeYes = detailed.filter(isIncomeTargeted);
  if (incomeYes.length > 0 && incomeYes.length < detailed.length) {
    out.push(
      `**Targeting.** ${incomeYes.map(name).join(", ")} ${
        incomeYes.length > 1 ? "are" : "is"
      } income-targeted; ${detailed
        .filter((p) => !isIncomeTargeted(p))
        .map(name)
        .join(", ")} ${
        detailed.length - incomeYes.length > 1 ? "are" : "is"
      } open to all eligible households.`,
    );
  }

  // 3. Regulatory pairing: does the same jurisdiction have an active
  //    STANDARD or BAN policy covering a shared technology?
  const regulatoryPairs = policies
    .map((p) => {
      const partner = dataset.policies.find(
        (q) =>
          q.id !== p.id &&
          q.jurisdiction_id === p.jurisdiction_id &&
          q.status === "ACTIVE" &&
          q.mechanism_ids.some(
            (m) =>
              dataset.mechanisms.find((mm) => mm.id === m)?.kind === "STANDARD" ||
              dataset.mechanisms.find((mm) => mm.id === m)?.kind === "BAN",
          ) &&
          q.technology_ids.some((t) => p.technology_ids.includes(t)),
      );
      return { p, partner };
    })
    .filter(({ partner }) => partner);
  const without = detailed.filter(
    (p) => !regulatoryPairs.find((r) => r.p.id === p.id),
  );
  if (regulatoryPairs.length > 0 && without.length > 0) {
    for (const { p, partner } of regulatoryPairs) {
      out.push(
        `**Regulatory pairing.** ${name(p)} operates alongside ${name(partner!)}; ${without
          .map(name)
          .join(", ")} ${without.length > 1 ? "have" : "has"} no equivalent in force.`,
      );
    }
  }

  // 4. Status / timing
  const statuses = new Set(policies.map((p) => p.status));
  if (statuses.size > 1) {
    out.push(
      `**Status.** ${policies
        .map((p) => `${name(p)} is ${p.status.toLowerCase()}`)
        .join("; ")}.`,
    );
  }

  // 5. Incentive magnitude text
  const withIncentive = policies.filter((p) => p.incentive);
  const incentives = new Set(withIncentive.map((p) => p.incentive));
  if (incentives.size > 1) {
    out.push(
      `**Incentive design.** ${withIncentive
        .map((p) => `${name(p)}: ${p.incentive}`)
        .join(" · ")}`,
    );
  }

  return out.slice(0, 6);
}

const CONFIDENCE_ORDER = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * Potential lessons derived ONLY from outcomes linked to the compared
 * policies and their cited evidence. Never infers beyond the records.
 */
export function lessons(policies: Policy[], dataset: Dataset): Claim[] {
  const claims: Claim[] = [];

  for (const p of policies) {
    const name = p.short_name ?? p.name;
    const outcomes = dataset.outcomes.filter((o) => o.policy_id === p.id);

    if (outcomes.length === 0) {
      claims.push({
        text: `Insufficient evidence for ${name}.`,
        evidence_ids: [],
        confidence: "LOW",
        inference_type: "UNCERTAIN",
      });
      continue;
    }

    for (const o of outcomes) {
      const cited = o.evidence_ids
        .map((id) => dataset.evidence.find((e) => e.id === id))
        .filter(Boolean);
      const onlyDemo =
        cited.length > 0 && cited.every((e) => e!.data_status === "DEMO");
      const anyEvaluates = cited.some((e) => e!.policy_relevance === "EVALUATES");
      const minConfidence = cited.length
        ? CONFIDENCE_ORDER[
            Math.min(...cited.map((e) => CONFIDENCE_ORDER.indexOf(e!.confidence)))
          ]
        : "LOW";

      let text: string;
      if (o.inference === "CAUSAL") {
        text = `The evidence shows: ${o.headline}.`;
      } else if (o.inference === "CORRELATIONAL") {
        text = `Following ${name}, this was observed: ${o.headline}.`;
      } else {
        text = `Reported: ${o.headline}.`;
      }

      claims.push({
        text,
        evidence_ids: cited.map((e) => e!.id),
        confidence: minConfidence,
        inference_type: onlyDemo
          ? "UNCERTAIN"
          : anyEvaluates
            ? "DIRECTLY_SUPPORTED"
            : "SYNTHESISED",
      });
    }
  }

  return claims;
}
