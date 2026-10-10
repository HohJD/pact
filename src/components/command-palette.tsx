"use client";

import { useEffect, useMemo, useState } from "react";

import { useTheme } from "next-themes";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useDataset,
  useRepo,
} from "@/components/providers/dataset-provider";
import { submitAnalystQuestion } from "@/lib/ai/client";
import { useWorkspace, type WorkspaceView } from "@/store/workspace";

const QUESTIONS = [
  "Which policies have successfully accelerated heat-pump adoption?",
  "What could the UK learn from Germany?",
  "Compare UK and German building retrofit policies.",
  "How have countries financed residential retrofits?",
  "Which building policies have the strongest evidence of reducing energy consumption?",
  "Which policies offer low-interest loans?",
];

const VIEWS: WorkspaceView[] = [
  "RESULTS",
  "GRAPH",
  "MAP",
  "TIMELINE",
  "OUTCOMES",
];

interface SearchDocumentHit {
  id: string;
  policy_id: string;
  label: string;
  url: string | null;
  snippet: string;
}

export function CommandPalette() {
  const open = useWorkspace((s) => s.paletteOpen);
  const setOpen = useWorkspace((s) => s.setPaletteOpen);
  const dataset = useDataset();
  const repo = useRepo();
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);
  const openEvidence = useWorkspace((s) => s.openEvidence);
  const setView = useWorkspace((s) => s.setView);
  const { setTheme, resolvedTheme } = useTheme();
  const [q, setQ] = useState("");
  const [documentResults, setDocumentResults] = useState<{
    query: string;
    hits: SearchDocumentHit[];
  } | null>(null);
  const normalizedQuery = q.trim().toLowerCase();
  const visibleViews = VIEWS.filter((view) => {
    const label = `${view.charAt(0) + view.slice(1).toLowerCase()} view`;
    return !normalizedQuery || label.toLowerCase().includes(normalizedQuery);
  });
  const showThemeToggle =
    !normalizedQuery || "toggle theme".includes(normalizedQuery);

  const results = useMemo(
    () => (q.trim() ? repo.searchText(q) : null),
    [q, repo],
  );

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Document search failed");
          return response.json() as Promise<{ documents?: SearchDocumentHit[] }>;
        })
        .then((result) => {
          if (!controller.signal.aborted) {
            setDocumentResults({
              query,
              hits: Array.isArray(result.documents) ? result.documents : [],
            });
          }
        })
        .catch(() => {});
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [q]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  const pick = (kind: "policy" | "jurisdiction" | "mechanism" | "technology" | "evidence", id: string) => {
    if (kind === "evidence") {
      openEvidence(id);
    } else {
      select({ kind, id });
      openPanel("DETAILS");
    }
    close();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Jump to a policy, jurisdiction or evidence…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Questions">
          {QUESTIONS.filter((x) => x.toLowerCase().includes(q.toLowerCase())).map(
            (x) => (
              <CommandItem
                key={x}
                value={x}
                onSelect={() => {
                  void submitAnalystQuestion(x, dataset);
                  close();
                }}
              >
                {x}
              </CommandItem>
            ),
          )}
          {q.trim().length > 2 && (
            <CommandItem
              value={`ask:${q}`}
              onSelect={() => {
                void submitAnalystQuestion(q, dataset);
                close();
              }}
            >
              Ask the analyst: “{q}”
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {(visibleViews.length > 0 || showThemeToggle) && (
          <CommandGroup heading="Views">
            {visibleViews.map((v) => (
              <CommandItem
                key={v}
                value={`view-${v}`}
                onSelect={() => {
                  setView(v);
                  close();
                }}
              >
                {v.charAt(0) + v.slice(1).toLowerCase()} view
              </CommandItem>
            ))}
            {showThemeToggle && (
              <CommandItem
                value="toggle-theme"
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  close();
                }}
              >
                Toggle theme
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {results && (
          <>
            <CommandSeparator />
            {results.policies.length > 0 && (
              <CommandGroup heading="Policies">
                {results.policies.slice(0, 6).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`p-${p.id}-${p.name}`}
                    onSelect={() => pick("policy", p.id)}
                  >
                    {p.name}
                    <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                      {p.country_code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.jurisdictions.length > 0 && (
              <CommandGroup heading="Jurisdictions">
                {results.jurisdictions.slice(0, 4).map((j) => (
                  <CommandItem
                    key={j.id}
                    value={`j-${j.id}-${j.name}`}
                    onSelect={() => pick("jurisdiction", j.id)}
                  >
                    {j.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.technologies.length > 0 && (
              <CommandGroup heading="Technologies">
                {results.technologies.slice(0, 4).map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`t-${t.id}-${t.name}`}
                    onSelect={() => pick("technology", t.id)}
                  >
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.mechanisms.length > 0 && (
              <CommandGroup heading="Mechanisms">
                {results.mechanisms.slice(0, 4).map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`m-${m.id}-${m.name}`}
                    onSelect={() => pick("mechanism", m.id)}
                  >
                    {m.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.evidence.length > 0 && (
              <CommandGroup heading="Evidence">
                {results.evidence.slice(0, 5).map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`e-${e.id}-${e.title}`}
                    onSelect={() => pick("evidence", e.id)}
                  >
                    {e.title}
                    <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                      {e.publisher.slice(0, 18)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {documentResults?.query === q.trim() &&
              documentResults.hits.length > 0 && (
                <CommandGroup heading="Documents">
                  {documentResults.hits.map((hit) => (
                    <CommandItem
                      key={hit.id}
                      value={`document ${hit.label} ${hit.snippet}`}
                      onSelect={() => pick("policy", hit.policy_id)}
                      className="block min-w-0 max-w-full overflow-hidden text-left"
                    >
                      <span className="block break-words font-medium">
                        {hit.label}
                      </span>
                      <span className="mt-1 line-clamp-2 block whitespace-normal break-words text-xs text-muted-foreground">
                        {hit.snippet}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
