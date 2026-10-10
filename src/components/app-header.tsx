"use client";

import { useRef, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  ArrowRight,
  PanelRight,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { useOptionalDataset } from "@/components/providers/dataset-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const LINKS = [
  { href: "/workspace", label: "Explore" },
  { href: "/admin/ingest", label: "Admin" },
];

export function AppHeader({
  variant,
  onToggleSidebar,
  onTogglePanel,
}: {
  variant: "page" | "workspace";
  onToggleSidebar?: () => void;
  onTogglePanel?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dataset = useOptionalDataset();
  const query = useWorkspace((s) => s.query);
  const setQuery = useWorkspace((s) => s.setQuery);
  const setView = useWorkspace((s) => s.setView);
  const analystPending = useWorkspace((s) => s.analystPending);
  const setPaletteOpen = useWorkspace((s) => s.setPaletteOpen);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = (draft ?? query).trim();
    setDraft(null);
    if (variant === "workspace") {
      if (!q) {
        setQuery("");
        return;
      }
      setView("RESULTS");
      if (dataset) void submitAnalystQuestion(q, dataset);
      return;
    }
    if (q) router.push(`/workspace?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="relative flex min-h-[64px] shrink-0 items-center gap-2 sm:gap-4 border-b border-border bg-card px-3">
      <div className="flex items-baseline gap-3">
        <Link
          href="/"
          aria-label="PACT home"
          className="font-mono text-[13px] font-semibold tracking-[0.25em] text-foreground transition-colors hover:text-muted-foreground"
        >
          PACT
        </Link>
        <span className="hidden text-[11px] text-muted-foreground xl:inline">
          Climate policy intelligence
        </span>
      </div>
      {variant === "workspace" && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground max-lg:p-2"
          aria-label="Filters"
        >
          <SlidersHorizontal className="size-3.5" />
        </button>
      )}
      {(variant === "workspace" || pathname !== "/") && <div className="flex min-w-0 flex-1 justify-center">
        <div className="flex h-10 w-full max-w-xl items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 focus-within:border-entity-policy/60 focus-within:shadow-[0_0_0_3px_rgba(76,141,255,0.15)]">
          <Sparkles className="size-3.5 text-entity-policy" />
          <input
            ref={inputRef}
            id="pact-command-input"
            value={draft ?? (variant === "workspace" ? query : "")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            aria-label="Search climate policies"
            placeholder="Ask or search climate policies…"
            className="w-full bg-transparent text-dense text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button type="button" onClick={submit} aria-label="Submit search" disabled={!(draft ?? query).trim()} className="rounded-md p-1.5 text-entity-policy hover:bg-secondary disabled:opacity-40"><ArrowRight className="size-4" /></button>
        </div>
      </div>}
      {variant === "page" && pathname === "/" && <div className="flex-1" />}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-4 text-[12px]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-[12.5px] underline-offset-[6px]",
                l.label === "Admin" && "hidden sm:inline",
                pathname.startsWith(l.href)
                  ? "text-foreground underline decoration-entity-policy decoration-1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {variant === "workspace" && (
          <>
            <button
              type="button"
              onClick={onTogglePanel}
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground max-lg:p-2"
              aria-label="Panel"
            >
              <PanelRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground max-lg:p-2"
              aria-label="Jump to…"
              title="Jump to…"
            >
              <span className="kbd max-sm:hidden">⌘</span>
              <span className="kbd max-sm:hidden">K</span>
              <Search className="size-3.5 sm:hidden" />
            </button>
          </>
        )}
        <ThemeToggle />
      </div>
      {variant === "workspace" && analystPending && (
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="h-full w-1/3 animate-[analyst-slide_1.1s_ease-in-out_infinite] bg-entity-policy" />
        </div>
      )}
    </header>
  );
}
