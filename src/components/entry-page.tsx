"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  GitCompareArrows,
  Link2,
  Scale,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";

import { storeLastQuery } from "@/components/back-to-results";
import { useDataset } from "@/components/providers/dataset-provider";

const EXAMPLES = [
  "Which policies accelerated heat-pump adoption?",
  "heat pump grants",
  "insulation subsidies for low-income households",
  "building energy codes",
];

// Real records in the bundled dataset, so every link below opens a page that exists.
const SHOWCASE = {
  question: "Which policies accelerated heat-pump adoption?",
  policy: { id: "pol_gb_bus", name: "Boiler Upgrade Scheme" },
  compare: { a: "pol_gb_bus", b: "pol_de_beg", label: "UK Boiler Upgrade Scheme vs Germany’s BEG" },
};

const PRINCIPLES = [
  {
    icon: Link2,
    title: "Every claim cites a record",
    body: "Answers carry citation chips that open the evidence itself: methodology, findings, limitations and the source link, or an explicit “no verified link”.",
  },
  {
    icon: Scale,
    title: "Correlation is labelled correlation",
    body: "Causal wording only appears when the cited study used causal methods. Everything else is marked as correlational or descriptive.",
  },
  {
    icon: Tags,
    title: "Provenance on every record",
    body: "Curated from public sources, imported from the Climate Policy Database (unreviewed), or demo. The label travels with the record everywhere it appears.",
  },
  {
    icon: ShieldCheck,
    title: "Not a forecast",
    body: "Policy transfer describes what happened elsewhere and how the contexts differ. PACT never predicts what a policy will do in your country.",
  },
];

export function EntryPage() {
  const router = useRouter();
  const dataset = useDataset();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (q = input) => {
    const t = q.trim();
    if (!t) return;
    setInput(t);
    storeLastQuery(t);
    router.push(`/workspace?q=${encodeURIComponent(t)}`);
  };

  // "/" focuses the input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const curated = dataset.policies.filter((p) => p.data_status === "CURATED").length;
  const imported = dataset.policies.filter((p) => p.data_status === "IMPORTED").length;
  const evidence = dataset.evidence.filter((e) => e.data_status !== "DEMO").length;
  const STATS: Array<[number, string, string]> = [
    [curated, "Curated policies", "Compiled from public sources, linked to evidence"],
    [evidence, "Evidence records", "Evaluations, statistics and studies"],
    [dataset.outcomes.length, "Outcomes", "Each one tied to its evidence"],
    [dataset.jurisdictions.length, "Jurisdictions", "National, state, city and EU"],
    [imported, "Imported policies", "Climate Policy Database, unreviewed"],
  ];

  return (
    <div className="relative flex-1">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_20%,transparent_75%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[820px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--entity-policy)_16%,transparent),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-entity-outcome" aria-hidden />
            Climate policy intelligence
          </p>
          <h1 className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[60px]">
            What has actually worked?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Governments run climate experiments every year. PACT maps them, links every claim to its evidence, and lets you
            compare what worked elsewhere with your own context.
          </p>

          <form
            className="mt-9"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-border bg-card px-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent),0_20px_50px_-24px_color-mix(in_srgb,var(--entity-policy)_45%,transparent)] focus-within:border-entity-policy/60 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--entity-policy)_18%,transparent)]">
              <Search className="size-5 shrink-0 text-entity-policy" aria-hidden />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Search climate policies"
                placeholder="Ask a question or search a policy…"
                autoFocus
                className="w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="kbd hidden sm:inline">/</kbd>
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-entity-policy px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="sr-only sm:hidden">Search</span>
              </button>
            </div>
          </form>

          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Example searches">
            {EXAMPLES.map((e) => (
              <li key={e}>
                <button
                  type="button"
                  onClick={() => submit(e)}
                  className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-[12.5px] text-muted-foreground backdrop-blur transition-colors hover:border-entity-policy/50 hover:text-foreground"
                >
                  {e}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Product preview: a real capture of the workspace answering the showcase question */}
        <div className="relative mx-auto mt-14 w-full max-w-6xl sm:mt-16">
          <button
            type="button"
            onClick={() => submit(SHOWCASE.question)}
            className="group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_40px_100px_-40px_color-mix(in_srgb,var(--entity-policy)_40%,transparent),0_20px_40px_-30px_#000] transition-transform hover:-translate-y-0.5"
            aria-label="Open this example in the workspace"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-border" aria-hidden />
              <span className="size-2.5 rounded-full bg-border" aria-hidden />
              <span className="size-2.5 rounded-full bg-border" aria-hidden />
              <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                /workspace?q={SHOWCASE.question}
              </span>
              <span className="ml-auto hidden items-center gap-1 text-[12px] font-medium text-entity-policy group-hover:underline sm:inline-flex">
                Open this view <ArrowUpRight className="size-3.5" aria-hidden />
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/workspace-dark.webp" alt="The PACT workspace: a similarity graph of heat-pump policies, filters on the left and the analyst’s cited answer on the right." width={1800} height={1075} className="hidden w-full dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/workspace-light.webp" alt="The PACT workspace: a similarity graph of heat-pump policies, filters on the left and the analyst’s cited answer on the right." width={1800} height={1075} className="w-full dark:hidden" />
          </button>
        </div>
      </section>

      {/* ── What's inside ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/40 px-5 py-10" aria-label="What’s in the dataset">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map(([n, label, detail]) => (
            <div key={label}>
              <dt className="text-[13px] font-medium text-foreground">{label}</dt>
              <dd className="mt-1">
                <span className="block font-mono text-[32px] font-medium leading-none tracking-tight">{n}</span>
                <span className="mt-2 block text-[12.5px] leading-snug text-muted-foreground">{detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── How it works: three real, clickable examples ─────────────────── */}
      <section className="px-5 py-20 sm:py-24" aria-labelledby="how-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-entity-policy">How it works</p>
          <h2 id="how-title" className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">
            From a question to the evidence behind the answer.
          </h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            <li className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <span className="flex items-center gap-2"><span className="font-mono text-[12px] text-muted-foreground">01</span><Search className="size-4 text-entity-policy" aria-hidden /></span>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">Ask, or search</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Policies are ranked and drawn as a similarity map. The analyst answers with a citation on every claim.
              </p>
              <button type="button" onClick={() => submit(SHOWCASE.question)} className="mt-auto pt-6 text-left text-[13.5px] font-medium text-entity-policy hover:underline">
                Try it on heat-pump policy →
              </button>
            </li>
            <li className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <span className="flex items-center gap-2"><span className="font-mono text-[12px] text-muted-foreground">02</span><BookOpenCheck className="size-4 text-entity-evidence" aria-hidden /></span>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">Read the policy and its evidence</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Design, timeline, sources, evidence graded by method, outcomes and the closest policies elsewhere.
              </p>
              <Link href={`/policy/${SHOWCASE.policy.id}`} className="mt-auto pt-6 text-[13.5px] font-medium text-entity-policy hover:underline">
                Open the {SHOWCASE.policy.name} →
              </Link>
            </li>
            <li className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <span className="flex items-center gap-2"><span className="font-mono text-[12px] text-muted-foreground">03</span><GitCompareArrows className="size-4 text-entity-jurisdiction" aria-hidden /></span>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">Compare approaches</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Two policies side by side, dimension by dimension, with a similarity score you can reweight.
              </p>
              <Link href={`/compare/${SHOWCASE.compare.a}/${SHOWCASE.compare.b}`} className="mt-auto pt-6 text-[13.5px] font-medium text-entity-policy hover:underline">
                {SHOWCASE.compare.label} →
              </Link>
            </li>
          </ol>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/40 px-5 py-20 sm:py-24" aria-labelledby="trust-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-entity-outcome">Built to be cited</p>
          <h2 id="trust-title" className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">
            Evidence over answers.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            PACT is for people who have to defend a recommendation. These rules are enforced in the data model and again on every AI answer.
          </p>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-5 text-entity-policy" aria-hidden />
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="px-5 py-20 text-center sm:py-24">
        <h2 className="mx-auto max-w-xl text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">
          Start from what worked, not from zero.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/workspace" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-entity-policy px-5 text-[14px] font-medium text-white hover:opacity-90">
            Open the workspace <ArrowRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              inputRef.current?.focus({ preventScroll: true });
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-[14px] font-medium hover:border-entity-policy/50"
          >
            Ask a question
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 text-[12.5px] text-muted-foreground sm:flex-row sm:justify-between">
          <div>
            <p className="font-mono text-[13px] font-semibold tracking-[0.25em] text-foreground">PACT</p>
            <p className="mt-2 max-w-sm leading-relaxed">
              Curated records are compiled from public sources. Verify against the original before citing.
            </p>
          </div>
          <div className="max-w-md leading-relaxed sm:text-right">
            <p>
              Imported policy metadata:{" "}
              <a href="https://climatepolicydatabase.org/" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                Climate Policy Database
              </a>
              , NewClimate Institute,{" "}
              <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                CC BY-NC 4.0
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
