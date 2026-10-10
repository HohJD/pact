import { redirect } from "next/navigation";

import { loadDataset } from "@/lib/data";
import { DatasetProvider } from "@/components/providers/dataset-provider";
import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { AppHeader } from "@/components/app-header";
import { EntryPage } from "@/components/entry-page";

export const metadata = { title: "PACT — Climate policy intelligence" };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // old deep links (/?q=…, sessionStorage) land on the unified Explore surface
  const { q } = await searchParams;
  if (q?.trim()) {
    redirect(`/workspace?q=${encodeURIComponent(q)}`);
  }

  const dataset = await loadDataset();
  return (
    <DatasetProvider dataset={dataset}>
      <div className="flex min-h-screen flex-col">
        <AppHeader variant="page" />
        <EntryPage />
      </div>
      <EvidenceDrawer />
    </DatasetProvider>
  );
}
