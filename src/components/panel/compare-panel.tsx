"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { SectionTitle } from "./section-title";

export function ComparePanel() {
  const dataset = useDataset();
  const compareIds = useWorkspace((s) => s.compareIds);
  const toggleCompare = useWorkspace((s) => s.toggleCompare);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  const policies = compareIds
    .map((id) => dataset.policies.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="flex h-full flex-col p-3">
      <SectionTitle>Compare ({policies.length}/4)</SectionTitle>
      {policies.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Add policies from their detail card or the graph context menu.
        </p>
      )}
      <ul className="space-y-1">
        {policies.map(
          (p) =>
            p && (
              <li
                key={p.id}
                className="flex items-center justify-between gap-1 rounded border border-border/60 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    select({ kind: "policy", id: p.id });
                    openPanel("DETAILS");
                  }}
                  className="truncate text-left text-[11px] text-foreground hover:underline"
                >
                  {p.short_name ?? p.name}
                </button>
                <button
                  type="button"
                  onClick={() => toggleCompare(p.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </li>
            ),
        )}
      </ul>
      <Button
        className="mt-auto"
        disabled={policies.length < 2}
        title={policies.length < 2 ? "Select at least two policies" : undefined}
        onClick={() => openPanel("COMPARE")}
      >
        Open comparison
      </Button>
    </div>
  );
}
