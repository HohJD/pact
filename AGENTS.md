# PACT — agent notes

Climate policy intelligence platform. Next.js App Router + Tailwind + Zustand +
React Flow + d3 + Recharts + Framer Motion. See `README.md` for the full
architecture, data model and trust rules.

## Commands

```bash
pnpm dev        # http://localhost:3001  (NOT :3000 — occupied)
pnpm tsc --noEmit
pnpm lint
pnpm test       # vitest unit tests
pnpm test:e2e   # playwright (reuses the dev server on :3001)
pnpm embed      # regenerate embeddings + computed similarities (needs key)
pnpm seed:supabase
```

## Data honesty — non-negotiable

- `data_status: "DEMO"` means synthetic. Never present it as a real citation.
- Correlation is labelled correlation. Causal wording only with EXPERIMENTAL /
  QUASI_EXPERIMENTAL / META_ANALYSIS evidence.
- Every claim cites evidence ids that exist; guardrails drop anything else.
- `source_url` is `null` rather than invented.

## Lead-authored — do not edit without review

- `src/lib/ai/prompts.ts` — system prompts (the trust boundary)
- `src/lib/ai/fallback-content.ts` — curated analyst responses
- `src/lib/ai/transfer-fallback.ts` — curated transfer assessments

## Conventions

- Entity colours/tokens in `src/app/globals.css` + `src/lib/theme/entity.ts`.
- Domain schema = `src/lib/domain/schema.ts` (Zod, single source of truth;
  keep `supabase/migrations/0001_init.sql` in sync).
- Repository boundary (`src/lib/data`) is where the data source swaps —
  don't reach into Supabase from components; ask the repository.
- `window.__pact` (the zustand store) is dev/`?debug=1`-gated; e2e uses it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
