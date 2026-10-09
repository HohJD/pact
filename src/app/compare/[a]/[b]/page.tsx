import { notFound } from "next/navigation";
import Link from "next/link";

import { BackToResults } from "@/components/back-to-results";
import { Flag } from "@/components/flag";
import { SiteNav } from "@/components/site-nav";
import { loadDataset } from "@/lib/data";
import { explainSimilarity } from "@/lib/similarity/engine";
import { structuredSimilarity } from "@/lib/similarity/structured";
import { semanticScores } from "@/data/seed/semantic";
import { type Policy } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";
import { CompareScore } from "./compare-score";

export const dynamic = "force-dynamic";

const PILL: Record<string, string> = {
  same: "border-entity-outcome/40 bg-entity-outcome/15 text-entity-outcome",
  partial:
    "border-entity-mechanism/40 bg-entity-mechanism/15 text-entity-mechanism",
  different: "border-border bg-secondary text-muted-foreground",
};

function PolicyHeader({
  policy,
  jurisdictionName,
}: {
  policy: Policy;
  jurisdictionName: string | null;
}) {
  const short = policy.description?.slice(0, 240);
  return (
    <div className="flex-1 text-center">
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
        <Flag code={policy.country_code} />
        {jurisdictionName ?? policy.country_code} ·{" "}
        {policy.introduced?.slice(0, 4)}
      </p>
      <h2 className="mt-1 text-[15px] font-semibold leading-snug">
        <Link href={`/policy/${policy.id}`} className="hover:underline">
          {policy.name}
        </Link>
      </h2>
      {policy.short_name && (
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {policy.short_name}
        </p>
      )}
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {policy.status}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[11.5px] leading-snug text-muted-foreground">
        {short}
        {policy.description && policy.description.length > 240 ? "…" : ""}{" "}
        <Link
          href={`/policy/${policy.id}`}
          className="text-entity-policy hover:underline"
        >
          more
        </Link>
      </p>
    </div>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const dataset = await loadDataset();
  const policyA = dataset.policies.find((p) => p.id === a);
  const policyB = dataset.policies.find((p) => p.id === b);
  if (!policyA || !policyB) notFound();

  const stored = dataset.similarities.find(
    (s) => s.policy_a === a && s.policy_b === b,
  );
  const sim = stored ?? {
    id: `sim_${[a, b].sort().join("_")}`,
    policy_a: a,
    policy_b: b,
    breakdown: structuredSimilarity(
      policyA,
      policyB,
      dataset.jurisdictions,
      semanticScores[[a, b].sort().join("|")],
    ),
  };
  const rows = explainSimilarity(sim, dataset);
  const jurName = (id: string) =>
    dataset.jurisdictions.find((j) => j.id === id)?.name ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <BackToResults />
          <span aria-hidden>·</span>
          <Link
            href={`/policy/${policyA.id}`}
            className="hover:text-foreground"
          >
            {policyA.short_name ?? policyA.name}
          </Link>
          <span aria-hidden>↔</span>
          <Link
            href={`/policy/${policyB.id}`}
            className="hover:text-foreground"
          >
            {policyB.short_name ?? policyB.name}
          </Link>
          <Link
            href={`/compare/${b}/${a}`}
            className="ml-auto text-entity-policy hover:underline"
          >
            Swap ↔
          </Link>
        </nav>
        <h1 className="mb-4 mt-3 font-mono text-lg font-semibold tracking-wide">
          Compare
        </h1>
        <div className="flex items-stretch gap-4 rounded border border-border bg-card p-4">
          <PolicyHeader
            policy={policyA}
            jurisdictionName={jurName(policyA.jurisdiction_id)}
          />
          <div className="flex w-40 shrink-0 flex-col items-center justify-center border-x border-border/60 px-3">
            <CompareScore breakdown={sim.breakdown} />
          </div>
          <PolicyHeader
            policy={policyB}
            jurisdictionName={jurName(policyB.jurisdiction_id)}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[110px_80px_1fr] items-baseline gap-3 border-b border-border/50 py-1.5 text-[12px]"
            >
              <span className="font-medium">{r.label}</span>
              <span>
                <span
                  className={cn(
                    "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
                    PILL[r.status],
                  )}
                >
                  {r.status}
                </span>
              </span>
              <span className="text-muted-foreground">{r.detail}</span>
            </div>
          ))}
          <div className="grid grid-cols-[110px_80px_1fr] items-baseline gap-3 border-b border-border/50 py-1.5 text-[12px]">
            <span className="font-medium">Semantic</span>
            <span className="font-mono text-[10px] tabular-nums">
              {Math.round(sim.breakdown.semantic * 100)}/100
            </span>
            <span className="text-muted-foreground">
              <span className="mr-1 rounded border border-entity-policy/40 px-1 font-mono text-[8px] uppercase text-entity-policy">
                AI · local embeddings
              </span>
              embedding similarity of policy descriptions
            </span>
          </div>
        </div>

        <p className="mt-6">
          <Link
            href={`/workspace?compare=${a},${b}`}
            className="text-[12px] text-entity-policy hover:underline"
          >
            Open side by side in Explore →
          </Link>
        </p>
      </main>
    </div>
  );
}
