import { Suspense } from "react";

import { loadDataset } from "@/lib/data";
import { DatasetProvider } from "@/components/providers/dataset-provider";
import { WorkspaceShell } from "./workspace-shell";

export const metadata = { title: "Workspace — PACT" };

export default async function WorkspacePage() {
  const dataset = await loadDataset();
  return (
    <DatasetProvider dataset={dataset}>
      <Suspense>
        <WorkspaceShell />
      </Suspense>
    </DatasetProvider>
  );
}
