import { Suspense } from "react";

import { getRepository } from "@/lib/data";
import { DatasetProvider } from "@/components/providers/dataset-provider";
import { WorkspaceShell } from "./workspace-shell";

export const metadata = { title: "Workspace — PACT" };

export default function WorkspacePage() {
  const dataset = getRepository().getDataset();
  return (
    <DatasetProvider dataset={dataset}>
      <Suspense>
        <WorkspaceShell />
      </Suspense>
    </DatasetProvider>
  );
}
