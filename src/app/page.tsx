"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { NetworkPreview } from "@/components/landing/network-preview";
import { ThemeToggle } from "@/components/theme-toggle";

const SUGGESTED = [
  "Which policies have accelerated heat-pump adoption?",
  "Compare UK and German building retrofit policies.",
  "How have countries financed residential retrofits?",
  "Which building policies have the strongest evidence of reducing energy consumption?",
];

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [leaving, setLeaving] = useState(false);

  const go = (path: string) => {
    setLeaving(true);
    setTimeout(() => router.push(path), 200);
  };
  const submit = () => {
    const q2 = q.trim();
    if (q2) go(`/workspace?q=${encodeURIComponent(q2)}`);
  };

  return (
    <motion.main
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      className="relative flex min-h-screen flex-col"
    >
      <header className="flex h-14 items-center justify-between px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[14px] font-semibold tracking-[0.25em]">
            PACT
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Climate policy intelligence
          </span>
        </div>
        <nav className="flex items-center gap-4 text-[12px]">
          <a href="/workspace" className="text-muted-foreground hover:text-foreground">
            Workspace
          </a>
          <a href="/demo" className="text-muted-foreground hover:text-foreground">
            Demo
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-[820px] flex-1 flex-col items-center justify-center px-5 pb-24 pt-10 text-center">
        <p className="mb-6 text-[13px] text-muted-foreground">
          Explore what the world has tried. Understand what appears to work.
        </p>
        <h1 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
          Learn from the world&apos;s climate experiments.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Explore climate policies, compare how they work, and trace them to
          evidence of real-world outcomes.
        </p>

        <div className="glass mt-9 flex h-14 w-full max-w-xl items-center gap-3 rounded-lg px-4">
          <Sparkles className="size-4 shrink-0 text-entity-policy" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="What climate policy are you investigating?"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => go(`/workspace?q=${encodeURIComponent(s)}`)}
              className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go("/workspace")}
            className="rounded-md bg-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-background transition-opacity hover:opacity-85"
          >
            Explore policies
          </button>
          <button
            type="button"
            onClick={() => go("/workspace?view=MAP")}
            className="rounded-md border border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
          >
            View global map
          </button>
        </div>

        <div className="pointer-events-none mt-10 h-[300px] w-full max-w-3xl sm:h-[340px]">
          <NetworkPreview />
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 border-t border-border px-5 py-4">
        {["Evidence over answers", "Relationships over documents", "Collective learning"].map(
          (s) => (
            <span
              key={s}
              className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {s}
            </span>
          ),
        )}
      </footer>
    </motion.main>
  );
}
