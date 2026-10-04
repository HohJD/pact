/**
 * Generates src/data/seed/embeddings.json — embeddings for every policy and
 * evidence record via the configured OpenRouter embedding model.
 * Usage: OPENROUTER_API_KEY=… pnpm embed
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
config({ path: ".env.local" });

import { seedDataset } from "../src/data/seed";
import { OpenRouterProvider } from "../src/lib/ai/provider";

const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error("OPENROUTER_API_KEY is not set — cannot embed.");
  process.exit(1);
}

const provider = new OpenRouterProvider(key);
const CHUNK = 64;

async function embedAll(
  items: { id: string; text: string }[],
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = items.slice(i, i + CHUNK);
    const vectors = await provider.embed(batch.map((b) => b.text));
    batch.forEach((b, j) => (out[b.id] = vectors[j]));
    console.log(`embedded ${Math.min(i + CHUNK, items.length)}/${items.length}`);
  }
  return out;
}

async function main() {
  const policies = await embedAll(
    seedDataset.policies.map((p) => ({
      id: p.id,
      text: `${p.name}\n${p.description}\n${p.incentive}`,
    })),
  );
  const evidence = await embedAll(
    seedDataset.evidence.map((e) => ({
      id: e.id,
      text: `${e.title}\n${e.findings.join(" ")}`,
    })),
  );
  const file = path.join(process.cwd(), "src/data/seed/embeddings.json");
  writeFileSync(file, JSON.stringify({ policies, evidence }));
  console.log(`wrote ${file} (${Object.keys(policies).length} policies, ${Object.keys(evidence).length} evidence)`);
}

main();
