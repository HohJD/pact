import { Suspense } from "react";

import { loadDataset } from "@/lib/data";
import { DatasetProvider } from "@/components/providers/dataset-provider";
import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { SearchPage } from "@/components/search/search-page";
import { SiteNav } from "@/components/site-nav";

export const metadata = { title: "Search — PACT" };

export default async function Home() {
  const dataset = await loadDataset();
  return (
    <DatasetProvider dataset={dataset}>
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <Suspense>
          <SearchPage />
        </Suspense>
      </div>
      <EvidenceDrawer />
    </DatasetProvider>
  );
}
