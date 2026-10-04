import { loadDataset } from "@/lib/data";
import { IngestClient } from "./ingest-client";

export const metadata = { title: "Ingest — PACT admin" };

export default async function IngestPage() {
  const dataset = await loadDataset();
  return <IngestClient dataset={dataset} />;
}
