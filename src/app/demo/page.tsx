import { Suspense } from "react";

import { loadDataset } from "@/lib/data";
import { DatasetProvider } from "@/components/providers/dataset-provider";
import { WorkspaceShell } from "@/app/workspace/workspace-shell";

export const metadata = { title: "Demo — PACT" };

export default async function DemoPage() {
  const dataset = await loadDataset();
  return (
    <DatasetProvider dataset={dataset}>
      <Suspense>
        <WorkspaceShell demo />
      </Suspense>
    </DatasetProvider>
  );
}
