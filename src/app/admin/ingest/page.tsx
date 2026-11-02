import { loadDataset } from "@/lib/data";
import { IngestClient } from "./ingest-client";

export const metadata = { title: "Ingest (internal) | PACT", robots: { index: false, follow: false } };

export default async function IngestPage() {
  const dataset = await loadDataset();
  return <IngestClient dataset={dataset} />;
}
