/**
 * Imports building and heating policies from NewClimate Institute's Climate
 * Policy Database (free public API, no key) into src/data/seed/cpdb.json.
 * Usage: pnpm import:cpdb   (then `pnpm embed` to refresh local similarity)
 *
 * Data: Climate Policy Database, NewClimate Institute, CC BY-NC 4.0.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { policies as curated } from "../src/data/seed/policies";
import { Policy } from "../src/lib/domain/schema";
import {
  CPDB_API,
  CPDB_COUNTRIES,
  disambiguateNames,
  findCuratedDuplicate,
  isBuildingPolicy,
  mapCpdbRow,
  type CpdbRow,
} from "../src/lib/ingest/cpdb";

async function fetchCountry(iso: string): Promise<CpdbRow[]> {
  const res = await fetch(`${CPDB_API}?country_iso=${iso}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CPDB ${iso}: HTTP ${res.status}`);
  return (await res.json()) as CpdbRow[];
}

async function main() {
  const mapped: Policy[] = [];
  const skipped: string[] = [];
  const duplicates: string[] = [];

  for (const iso of Object.keys(CPDB_COUNTRIES)) {
    const rows = (await fetchCountry(iso)).filter(isBuildingPolicy);
    let kept = 0;
    for (const row of rows) {
      const p = mapCpdbRow(row);
      if (!p) {
        skipped.push(`${iso} ${row.policy_id} ${row.policy_title ?? ""}`);
        continue;
      }
      const dup = findCuratedDuplicate(p, curated);
      if (dup) {
        duplicates.push(`${p.name}  ≈  ${dup.name} (${dup.id})`);
        continue;
      }
      mapped.push(Policy.parse(p));
      kept++;
    }
    console.log(`${iso}: ${rows.length} building policies, ${kept} imported`);
  }

  const out = disambiguateNames(mapped).sort((a, b) => a.id.localeCompare(b.id));
  const file = path.join(process.cwd(), "src/data/seed/cpdb.json");
  writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);

  console.log(`\nskipped ${skipped.length} (sub-national, unknown status or no date)`);
  for (const s of skipped) console.log(`  - ${s}`);
  console.log(`dropped ${duplicates.length} already curated in PACT`);
  for (const d of duplicates) console.log(`  - ${d}`);
  console.log(`\nwrote ${file} (${out.length} policies)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
