"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import type { Dataset } from "@/lib/domain/schema";
import { renumberCitations } from "@/lib/ai/citations";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { useWorkspace } from "@/store/workspace";

const DEMO_QUESTION =
  "Which policies have successfully accelerated heat-pump adoption?";
const TRANSFER_QUESTION = "What could the UK learn from Germany?";
const COMPARE_IDS = ["pol_gb_bus", "pol_de_beg_em_2024", "pol_fr_maprimerenov"];

interface Ctx {
  dataset: Dataset;
  /** pause/skip-aware sleep — resolves early on skip, never while paused */
  wait: (ms: number) => Promise<void>;
}

interface Step {
  caption: string;
  run: (ctx: Ctx) => Promise<void> | void;
}

const STEPS: Step[] = [
  {
    caption: "The flagship question, answered from evidence",
    run: async ({ dataset }) => {
      await submitAnalystQuestion(DEMO_QUESTION, dataset, { demo: true });
    },
  },
  {
    caption: "Where it was tried",
    run: async ({ wait }) => {
      const s = useWorkspace.getState();
      s.setView("MAP");
      for (const c of ["GB", "DE", "FR"] as const) {
        s.focusCountry(c);
        await wait(600);
      }
    },
  },
  {
    caption: "Policies cluster around heat pumps",
    run: async ({ wait }) => {
      const s = useWorkspace.getState();
      s.setView("GRAPH");
      s.focusCountry(null);
      await wait(1400);
    },
  },
  {
    caption: "Evidence-backed overview",
    run: async ({ wait }) => {
      useWorkspace.getState().openPanel("ANALYST");
      await wait(2000);
    },
  },
  {
    caption: "Three policies side by side",
    run: async ({ wait }) => {
      const s = useWorkspace.getState();
      for (const id of COMPARE_IDS) {
        if (!s.compareIds.includes(id)) s.toggleCompare(id);
        await wait(300);
      }
    },
  },
  {
    caption: "Compare mechanisms and differences",
    run: async ({ wait }) => {
      useWorkspace.getState().openPanel("COMPARE");
      await wait(1400);
    },
  },
  {
    caption: "Key differences",
    run: async ({ wait }) => {
      document
        .getElementById("compare-key-differences")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      await wait(2500);
    },
  },
  {
    caption: "What happened afterwards",
    run: async ({ wait }) => {
      const s = useWorkspace.getState();
      s.select({ kind: "policy", id: "pol_de_beg_em_2024" });
      s.setView("OUTCOMES");
      await wait(1600);
    },
  },
  {
    caption: "What happened afterwards",
    run: ({ wait }) => wait(2500),
  },
  {
    caption: "Lessons, with evidence",
    run: async ({ dataset }) => {
      await submitAnalystQuestion(TRANSFER_QUESTION, dataset, { demo: true });
    },
  },
  {
    caption: "Trace to source",
    run: async ({ wait }) => {
      const s = useWorkspace.getState();
      const first = s.analystResponse
        ? renumberCitations(s.analystResponse.data).evidenceOrder[0]
        : undefined;
      if (first) s.openEvidence(first);
      await wait(2500);
    },
  },
  {
    caption:
      "Every claim traces to evidence. Correlation is labelled as correlation.",
    run: () => {},
  },
];

/**
 * Guided presenter for /demo — runs the 12-step scenario through real store
 * actions. Every step sets absolute state, so manual interaction while paused
 * doesn't break resuming. `?speed=fast` halves all pacing.
 */
export function DemoPresenter({ dataset }: { dataset: Dataset }) {
  const params = useSearchParams();
  const speed = params.get("speed") === "fast" ? 0.5 : 1;

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ctl = useRef({ gen: 0, paused: true });

  const wait = useCallback(
    (ms: number) => {
      const gen = ctl.current.gen;
      let left = ms * speed;
      return new Promise<void>((resolve) => {
        const tick = () => {
          if (ctl.current.gen !== gen) return resolve(); // cancelled/skipped
          if (ctl.current.paused) return void setTimeout(tick, 60);
          left -= 50;
          if (left <= 0) return resolve();
          setTimeout(tick, 50);
        };
        tick();
      });
    },
    [speed],
  );

  const loop = useCallback(
    async (from: number, gen: number) => {
      for (let i = from; i < STEPS.length; i++) {
        if (ctl.current.gen !== gen) return;
        setStep(i);
        await STEPS[i].run({ dataset, wait });
        await wait(400);
      }
      if (ctl.current.gen === gen) {
        setPlaying(false);
        ctl.current.paused = true;
      }
    },
    [dataset, wait],
  );

  const play = useCallback(() => {
    ctl.current.paused = false;
    setPlaying(true);
    const gen = ++ctl.current.gen;
    const at = step >= STEPS.length - 1 ? 0 : step;
    void loop(at, gen);
     
  }, [step, loop]);

  const pause = useCallback(() => {
    ctl.current.paused = true;
    setPlaying(false);
  }, []);

  const next = useCallback(() => {
    ctl.current.paused = false;
    setPlaying(true);
    const gen = ++ctl.current.gen;
    void loop(Math.min(step + 1, STEPS.length - 1), gen);
     
  }, [step, loop]);

  const restart = useCallback(() => {
    useWorkspace.getState().reset();
    setStep(0);
    ctl.current.paused = false;
    setPlaying(true);
    const gen = ++ctl.current.gen;
    void loop(0, gen);
     
  }, [loop]);

  // Space = play/pause · → = next (demo only, not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        if (playing) pause();
        else play();
      }
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, pause, next]);

  const done = step === STEPS.length - 1 && !playing;

  return (
    <div className="pointer-events-none fixed bottom-[calc(1rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 max-sm:left-auto max-sm:right-3 max-sm:max-w-[calc(100vw-4.5rem)] max-sm:translate-x-0">
      <div className="glass pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 shadow-xl">
        <button
          type="button"
          aria-label="Restart demo"
          onClick={restart}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause demo" : "Play demo"}
          data-demo-play
          onClick={() => (playing ? pause() : play())}
          className="flex size-6 items-center justify-center rounded-full bg-entity-policy/15 text-entity-policy hover:bg-entity-policy/25"
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
        <button
          type="button"
          aria-label="Next step"
          onClick={next}
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="size-3.5" />
        </button>
        <span className="font-mono text-[9px] text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>
        <span
          data-demo-caption
          className="max-w-[38vw] truncate border-l border-border pl-2 text-[10px] text-foreground sm:max-w-[240px]"
        >
          {done ? STEPS[STEPS.length - 1].caption : STEPS[step].caption}
        </span>
      </div>
    </div>
  );
}
