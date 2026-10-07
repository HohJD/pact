/**
 * Seeds a Supabase project with the PACT seed dataset.
 * Usage: pnpm seed:supabase  (reads .env.local)
 * Requires SUPABASE_SERVICE_ROLE_KEY — service role bypasses RLS for writes.
 * Idempotent: upserts on primary keys in FK order.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

import { seedDataset } from "../src/data/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env.local)");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const BATCH = 200;

// strip undefined values so JSON columns don't receive them
const clean = (rows: Record<string, unknown>[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)));

async function upsert(table: string, rows: Record<string, unknown>[]) {
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(table).upsert(clean(rows.slice(i, i + BATCH)));
    if (error) throw new Error(`${table}: ${error.message}`);
    n += Math.min(BATCH, rows.length - i);
  }
  console.log(`${table}: ${n} rows`);
}

async function main() {
  // FK order: jurisdictions → reference tables → policies → evidence → outcomes/time_series/similarities
  await upsert("jurisdictions", seedDataset.jurisdictions);
  await upsert("technologies", seedDataset.technologies);
  await upsert("mechanisms", seedDataset.mechanisms);
  await upsert("metrics", seedDataset.metrics);
  await upsert("policies", seedDataset.policies);
  await upsert("evidence", seedDataset.evidence);
  await upsert("outcomes", seedDataset.outcomes);
  await upsert("time_series", seedDataset.time_series);
  await upsert("similarities", seedDataset.similarities);

  const embFile = path.join(process.cwd(), "src/data/seed/embeddings.json");
  if (existsSync(embFile)) {
    const emb = JSON.parse(readFileSync(embFile, "utf8")) as {
      model: string;
      dims: number;
      policies?: Record<string, number[]>;
      evidence?: Record<string, number[]>;
    };
    const model = emb.model;
    if (emb.policies) {
      await upsert(
        "policy_embeddings",
        Object.entries(emb.policies).map(([policy_id, embedding]) => ({
          policy_id,
          embedding,
          model,
          updated_at: new Date().toISOString(),
        })),
      );
    }
    if (emb.evidence) {
      await upsert(
        "evidence_embeddings",
        Object.entries(emb.evidence).map(([evidence_id, embedding]) => ({
          evidence_id,
          embedding,
          model,
          updated_at: new Date().toISOString(),
        })),
      );
    }
  } else {
    console.log("no embeddings.json — skipping embeddings (run `pnpm embed` first)");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
