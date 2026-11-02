import { notFound } from "next/navigation";
import Link from "next/link";
import { GitCompare } from "lucide-react";

import { BackToResults } from "@/components/back-to-results";
import { Flag } from "@/components/flag";
import { InferenceChip } from "@/components/panel/inference-chip";
import { AppHeader } from "@/components/app-header";
import { loadDataset } from "@/lib/data";
import { SeedRepository } from "@/lib/data/seed-repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataset = await loadDataset();
  const policy = dataset.policies.find((p) => p.id === id);
  if (!policy) return { title: "Policy not found | PACT" };
  const place = dataset.jurisdictions.find((j) => j.id === policy.jurisdiction_id)?.name ?? policy.country_code;
  return { title: `${policy.name}, ${place} | PACT`, description: policy.description?.slice(0, 160) };
}

const STATUS_NOTE: Record<string, string> = {
  DEMO: "Synthetic sample record — not a real-world citation",
  CANDIDATE: "Machine-found, unreviewed — never counted in evidence strength",
  IMPORTED: "Bulk-imported metadata — unreviewed, no linked evidence",
  CURATED: "Curated from public information",
};

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await loadDataset();
  const policy = dataset.policies.find((p) => p.id === id);
  if (!policy) notFound();

  const repo = new SeedRepository(dataset);
  const jurisdiction = dataset.jurisdictions.find(
    (j) => j.id === policy.jurisdiction_id,
  );
  const mechanisms = policy.mechanism_ids
    .map((m) => dataset.mechanisms.find((x) => x.id === m)?.name ?? m);
  const technologies = policy.technology_ids
    .map((t) => dataset.technologies.find((x) => x.id === t)?.name ?? t);
  const evidence = dataset.evidence.filter((e) =>
    e.policy_ids.includes(policy.id),
  );
  const strength = repo.getEvidenceStrength(policy.id);
  const outcomes = dataset.outcomes.filter((o) => o.policy_id === policy.id);
  const similar = repo.getSimilar(policy.id, 8);

  const timelineRows: { date: string; label: string }[] = [
    { date: policy.introduced, label: "Introduced" },
    ...(policy.ended ? [{ date: policy.ended, label: "Ended" }] : []),
    ...outcomes.map((o) => ({
      date: o.period,
      label: `${o.headline}${o.magnitude ? ` (${o.magnitude})` : ""}`,
    })),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader variant="page" />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <BackToResults />
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Flag code={policy.country_code} />
          {jurisdiction?.name ?? policy.country_code}
          {jurisdiction?.level && (
            <span className="font-mono text-[9px] uppercase tracking-wider">
              {jurisdiction.level}
            </span>
          )}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
          {policy.name}
          {policy.short_name && (
            <span className="ml-3 align-middle font-mono text-[14px] font-normal tracking-normal text-muted-foreground">
              {policy.short_name}
            </span>
          )}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded border border-border px-1.5 py-0.5 font-mono uppercase tracking-wider">
            {policy.status}
          </span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono uppercase tracking-wider">
            {policy.sector.replace(/_/g, " ")}
          </span>
          {mechanisms.map((m) => (
            <span
              key={m}
              className="rounded border border-border px-1.5 py-0.5 text-muted-foreground"
            >
              {m}
            </span>
          ))}
          {technologies.map((t) => (
            <span
              key={t}
              className="rounded border border-entity-technology/40 px-1.5 py-0.5 text-entity-technology"
            >
              {t}
            </span>
          ))}
          <span className="text-muted-foreground">
            {policy.introduced}
            {policy.ended ? ` → ${policy.ended}` : ""}
          </span>
          <span
            className="rounded border border-border px-1.5 py-0.5 font-mono uppercase tracking-wider text-muted-foreground"
            title={STATUS_NOTE[policy.data_status]}
          >
            {policy.data_status}
          </span>
        </div>

        <p className="mt-6 text-[16px] leading-relaxed text-foreground/90">{policy.description}</p>

        <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-5 text-[13.5px] leading-relaxed sm:grid-cols-2">
          {policy.incentive && (
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Incentive
              </dt>
              <dd>{policy.incentive}</dd>
            </div>
          )}
          {policy.eligibility && (
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Eligibility
              </dt>
              <dd>{policy.eligibility}</dd>
            </div>
          )}
          {policy.funding && (
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Funding
              </dt>
              <dd>{policy.funding}</dd>
            </div>
          )}
          {policy.objectives.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Objectives
              </dt>
              <dd>
                <ul className="list-disc pl-5">
                  {policy.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>

        <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.01em]">Timeline</h2>
        <table className="mt-3 w-full text-[13px]">
          <tbody>
            {timelineRows.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="w-40 py-2 align-top font-mono text-muted-foreground">
                  {r.date}
                </td>
                <td>{r.label}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {policy.sources.length > 0 && (
          <>
            <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.01em]">Sources</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]">
              {policy.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-entity-policy hover:underline"
                    >
                      {s.label} ({s.publisher})
                    </a>
                  ) : (
                    <span>
                      {s.label} ({s.publisher})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.01em]">
          Evidence{" "}
          <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            strength: {strength.label}
          </span>
        </h2>
        {evidence.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            No linked evidence.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {evidence.map((e) => (
              <li
                key={e.id}
                className="rounded border border-border/60 p-2.5 text-[12px]"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-entity-evidence/40 px-1 py-px font-mono text-[8px] uppercase tracking-wider text-entity-evidence">
                    {e.evidence_type.replace(/_/g, " ")}
                  </span>
                  <span className="rounded border border-border px-1 py-px font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                    {e.causal_strength.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {e.publisher} · {e.publication_date}
                  </span>
                </div>
                <p className="mt-1 font-medium">{e.title}</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {e.findings.slice(0, 3).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {outcomes.length > 0 && (
          <>
            <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.01em]">Outcomes</h2>
            <ul className="mt-2 space-y-2">
              {outcomes.map((o) => (
                <li
                  key={o.id}
                  className="rounded border border-border/60 p-2.5 text-[12px]"
                >
                  <div className="flex items-center gap-2">
                    <InferenceChip inference={o.inference} />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {o.direction}
                      {o.magnitude ? ` · ${o.magnitude}` : ""} · {o.period}
                    </span>
                  </div>
                  <p className="mt-1">{o.headline}</p>
                  {o.note && (
                    <p className="mt-0.5 text-muted-foreground">{o.note}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.01em]">Similar policies</h2>
        {similar.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            No similar policies found.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {similar.map((s) => {
              const other = dataset.policies.find(
                (p) =>
                  p.id ===
                  (s.policy_a === policy.id ? s.policy_b : s.policy_a),
              );
              if (!other) return null;
              const jur = dataset.jurisdictions.find(
                (j) => j.id === other.jurisdiction_id,
              );
              return (
                <li
                  key={s.id}
                  className="relative flex items-baseline gap-2 rounded px-1 py-0.5 text-[12px] hover:bg-secondary/60"
                >
                  <Link
                    href={`/policy/${other.id}`}
                    className="absolute inset-0 rounded"
                    aria-label={other.name}
                    title={other.name}
                  />
                  <Flag code={other.country_code} />
                  <span className="min-w-0 flex-1 truncate">
                    {other.short_name ?? other.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {jur?.name ?? other.country_code} ·{" "}
                    {other.introduced?.slice(0, 4)}
                  </span>
                  <span className="font-mono text-[10px]">
                    {Math.round(s.breakdown.overall * 100)}/100
                  </span>
                  <Link
                    href={`/compare/${policy.id}/${other.id}`}
                    title="Compare"
                    aria-label={`Compare with ${other.name}`}
                    className="relative z-10 text-entity-policy"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8">
          <Link
            href={`/workspace?policy=${policy.id}`}
            className="text-[12px] text-entity-policy hover:underline"
          >
            Open in Explore →
          </Link>
        </p>
      </main>
    </div>
  );
}
