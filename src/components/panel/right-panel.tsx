"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useWorkspace } from "@/store/workspace";
import { AnalystPanel } from "./analyst-panel";
import { ComparePanel } from "./compare-panel";
import { EntityPanel } from "./entity-panel";
import { EvidencePanel } from "./evidence-panel";
import { JurisdictionPanel } from "./jurisdiction-panel";
import { OutcomesPanel } from "./outcomes-panel";
import { PolicyCard } from "./policy-card";
import { SimilarityPanel } from "./similarity-panel";
import { WorkspaceSummary } from "./workspace-summary";

export function RightPanel({
  open,
  demo = false,
  onClose,
}: {
  open: boolean;
  demo?: boolean;
  onClose?: () => void;
}) {
  const selection = useWorkspace((s) => s.selection);
  const panel = useWorkspace((s) => s.panel);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  let content: React.ReactNode = <WorkspaceSummary />;
  let show = open;

  if (panel === "ANALYST") {
    content = <AnalystPanel />;
    show = open;
  } else if (selection?.kind === "edge") {
    content = <SimilarityPanel edgeId={selection.id} />;
    show = show && panel === "SIMILARITY";
  } else if (selection?.kind === "jurisdiction") {
    content = <JurisdictionPanel jurisdictionId={selection.id} />;
    show = show && !!panel;
  } else if (selection?.kind === "mechanism" || selection?.kind === "technology") {
    content = <EntityPanel kind={selection.kind} id={selection.id} />;
    show = show && !!panel;
  } else if (selection?.kind === "evidence") {
    content = (
      <EvidencePanel policyId={undefined} />
    );
    show = show && !!panel;
  } else if (selection?.kind === "policy") {
    if (panel === "EVIDENCE") content = <EvidencePanel policyId={selection.id} hideAgent={demo} />;
    else if (panel === "OUTCOMES") content = <OutcomesPanel policyId={selection.id} />;
    else content = <PolicyCard policyId={selection.id} />;
    show = show && !!panel;
  } else if (panel === "COMPARE") {
    content = <ComparePanel />;
    show = show && true;
  }

  const close = () => {
    select(null);
    openPanel(null);
    onClose?.();
  };

  return (
    <AnimatePresence initial={false}>
      {show && (
        <>
          <motion.div
            key="right-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-[35] bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={close}
          />
          <motion.aside
            key="right-panel"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-[min(360px,92vw)] max-lg:shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close panel"
              onClick={close}
              className="absolute right-2 top-2 z-10 rounded bg-card p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
            {content}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
