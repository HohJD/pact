"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ArrowRight } from "lucide-react";

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

const PRINCIPLES: Array<[string, string]> = [
  ["Every claim cites a record", "Citations open the evidence itself: methodology, findings, limitations and the source, or an explicit note that no verified link exists."],
  ["Correlation is labelled correlation", "Causal language appears only where the cited study used causal methods. Everything else is marked correlational or descriptive."],
  ["Provenance travels with the record", "Curated from public sources, imported from the Climate Policy Database and unreviewed, or demo. The label follows the record everywhere."],
  ["Not a forecast", "Policy transfer describes what happened elsewhere and how contexts differ. PACT does not predict what a policy will do in your country."],
];

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13px] font-medium text-muted-foreground">{children}</p>
);

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
  const STATS: Array<[number, string]> = [
    [curated, "curated policies"],
    [evidence, "evidence records"],
    [dataset.outcomes.length, "evidenced outcomes"],
    [dataset.jurisdictions.length, "jurisdictions"],
  ];

  const STEPS = [
    {
      title: "Ask, or search",
      body: "Policies are ranked and drawn as a similarity map. The analyst answers with a citation on every claim.",
      link: <button type="button" onClick={() => submit(SHOWCASE.question)} className="text-left">Try it on heat-pump policy</button>,
    },
    {
      title: "Read the policy and its evidence",
      body: "Design, timeline, sources, evidence graded by method, outcomes and the closest policies elsewhere.",
      link: <Link href={`/policy/${SHOWCASE.policy.id}`}>The {SHOWCASE.policy.name}</Link>,
    },
    {
      title: "Compare approaches",
      body: "Two policies side by side, dimension by dimension, with a similarity score you can reweight.",
      link: <Link href={`/compare/${SHOWCASE.compare.a}/${SHOWCASE.compare.b}`}>{SHOWCASE.compare.label}</Link>,
    },
  ];

  return (
    <div className="flex-1">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
        <div className="max-w-3xl">
          <Kicker>Climate policy evidence</Kicker>
          <h1 className="mt-4 text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[72px]">
            What has actually worked?
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">
            Governments run climate experiments every year. PACT maps them, ties every claim to its evidence, and lets you
            compare what worked elsewhere with your own context.
          </p>

          <form
            className="mt-10 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex h-[52px] items-center rounded-[10px] border border-input bg-card pl-4 pr-1.5 transition-colors focus-within:border-foreground/40">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Search climate policies"
                placeholder="Ask a question or search a policy"
                autoFocus
                className="h-full w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="kbd mr-2 hidden sm:inline">/</kbd>
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-[7px] bg-foreground px-4 text-[14px] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="sr-only sm:hidden">Search</span>
              </button>
            </div>
          </form>

          <div className="mt-5 flex max-w-2xl flex-wrap items-baseline gap-x-4 gap-y-2 text-[14px] text-muted-foreground">
            <span>Try</span>
            <ul className="contents" aria-label="Example searches">
              {EXAMPLES.map((e) => (
                <li key={e} className="contents">
                  <button
                    type="button"
                    onClick={() => submit(e)}
                    className="text-foreground/80 underline decoration-border decoration-1 underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-foreground/50"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product shot: a real capture of the workspace answering the showcase question */}
        <figure className="mt-16 sm:mt-20">
          <button
            type="button"
            onClick={() => submit(SHOWCASE.question)}
            aria-label="Open this example in the workspace"
            className="block w-full overflow-hidden rounded-xl border border-border bg-card transition-[border-color] hover:border-foreground/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/workspace-dark.webp" alt="The PACT workspace: a similarity graph of heat-pump policies, filters on the left and the analyst’s cited answer on the right." width={1800} height={1075} className="hidden w-full dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/workspace-light.webp" alt="The PACT workspace: a similarity graph of heat-pump policies, filters on the left and the analyst’s cited answer on the right." width={1800} height={1075} className="w-full dark:hidden" />
          </button>
          <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted-foreground">
            <span>The workspace answering “{SHOWCASE.question}”</span>
            <button type="button" onClick={() => submit(SHOWCASE.question)} className="text-foreground hover:underline hover:underline-offset-4">
              Open this view →
            </button>
          </figcaption>
        </figure>
      </section>

      {/* ── Data ─────────────────────────────────────────────────────────── */}
      <section id="data" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 sm:px-8" aria-label="What’s in the dataset">
        <div className="border-y border-border py-10">
          <dl className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
            {STATS.map(([n, label]) => (
              <div key={label} className="sm:border-l sm:border-border sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
                <dd className="text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{n}</dd>
                <dt className="mt-2 text-[14px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-8 max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
            Curated records are compiled from public sources and linked to evidence. A further {imported} policies are imported from the
            Climate Policy Database: unreviewed, never linked to evidence, and hidden until you include them.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-28" aria-labelledby="how-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <Kicker>How it works</Kicker>
            <h2 id="how-title" className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              From a question to the evidence behind the answer.
            </h2>
          </div>
          <ol className="border-t border-border">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid gap-x-6 gap-y-2 border-b border-border py-7 sm:grid-cols-[2.5rem_1fr]">
                <span className="text-[14px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                  <p className="mt-3 text-[14px] font-medium text-entity-policy [&>*]:hover:underline [&>*]:hover:underline-offset-4">
                    {s.link} <span aria-hidden>→</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Method ───────────────────────────────────────────────────────── */}
      <section id="method" className="scroll-mt-20 border-t border-border bg-card/50" aria-labelledby="method-title">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <Kicker>Method</Kicker>
            <h2 id="method-title" className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              Evidence over answers.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Built for people who have to defend a recommendation. These rules hold in the data model and again on every AI answer.
            </p>
          </div>
          <dl className="grid gap-x-10 border-t border-border sm:grid-cols-2">
            {PRINCIPLES.map(([title, body]) => (
              <div key={title} className="border-b border-border py-7">
                <dt className="text-[16px] font-semibold tracking-[-0.015em]">{title}</dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
            Start from what worked, not from zero.
          </h2>
          <div className="flex gap-3">
            <Link href="/workspace" className="inline-flex h-11 items-center gap-1.5 rounded-[8px] bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-85">
              Open the workspace <ArrowRight className="size-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                inputRef.current?.focus({ preventScroll: true });
              }}
              className="inline-flex h-11 items-center rounded-[8px] border border-input px-5 text-[14px] font-medium hover:border-foreground/40"
            >
              Ask a question
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
          <p>
            <span className="font-semibold tracking-[0.2em] text-foreground">PACT</span>
            <span className="ml-3">Verify curated records against the original source before citing.</span>
          </p>
          <p>
            Imported data:{" "}
            <a href="https://climatepolicydatabase.org/" target="_blank" rel="noreferrer" className="text-foreground/80 underline decoration-border underline-offset-4 hover:text-foreground">
              Climate Policy Database
            </a>
            , NewClimate Institute,{" "}
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer" className="text-foreground/80 underline decoration-border underline-offset-4 hover:text-foreground">
              CC BY-NC 4.0
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
