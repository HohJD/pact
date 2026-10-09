# PACT — Climate Policy Intelligence

Premium institutional intelligence for climate policy. PACT maps how policies
relate — to jurisdictions, mechanisms, technologies, evidence and outcomes —
and lets analysts explore, compare and trace every claim back to a record.

**The 30-second pitch:** governments run climate experiments every year. PACT
turns those experiments into a searchable, comparable, evidence-linked map so
the next policymaker doesn't start from zero.

**Three principles**

- **Evidence over answers** — every claim carries citations and an inference
  type; nothing is asserted without a record.
- **Relationships over documents** — policies live in a graph, not a library.
- **Collective learning** — the platform's purpose is transferring what worked
  elsewhere, honestly labelled.

## What PACT is not

- Not a news site, not a green brochure, not a generic SaaS dashboard.
- Not a prediction engine: Policy Transfer describes what happened elsewhere
  and how contexts differ. It never forecasts outcomes.
- Not a citation farm: DEMO records are synthetic placeholders, always labelled,
  never a real-world citation.

## Architecture

```
src/app (Next.js App Router)
 ├── /                  landing
 ├── /workspace         the product shell (server component → loadDataset)
 ├── /demo              deterministic curated scenario
 ├── /admin/ingest      internal ingestion + human review
 └── /api/*
      analyst | transfer | evidence-agent | ingest

                ┌──────────────────────────────┐
                │  PactRepository boundary     │
                │  getRepository/loadDataset   │
                └──────────┬───────────────────┘
              Seed (in-memory)      Supabase (9 tables + pgvector)
              src/data/seed         supabase/migrations + service seeding

AI layer
  provider (OpenRouter, response_format ladder)
    → retrieval (MiniSearch + optional local-embedding blend)
    → analyst / evidence-agent / transfer
    → guardrails (citation pruning, causal-language guard, DEMO tagging)
    → UIActions applied to the workspace store
```

## Data model

Defined in `src/lib/domain/schema.ts` (Zod — the single source of truth).

| Entity        | Key fields                                                        |
| ------------- | ----------------------------------------------------------------- |
| Jurisdiction  | name, country_code, level (NATIONAL/STATE/CITY/SUPRANATIONAL), lat/lng, context (heating mix, prices, ownership) |
| Policy        | status, introduced/ended, sector, technology_ids, mechanism_ids, target_groups, eligibility, incentive, funding, objectives, sources, tags |
| Evidence      | evidence_type, methodology, geography, policy_ids, policy_relevance, metrics, findings, limitations, confidence, causal_strength |
| Outcome       | policy_id, metric_id, headline, direction, magnitude, period, inference, evidence_ids |
| TimeSeries    | metric_id, country_code, points[], precision (REPORTED/APPROXIMATE/ILLUSTRATIVE) |
| Similarity    | policy_a, policy_b, breakdown (semantic, same_*, jurisdiction_similarity, overall, differences) |
| Metric / Mechanism / Technology | reference vocabularies           |

**Relation types:** IMPLEMENTED_BY, USES_MECHANISM, TARGETS, SIMILAR_TO,
SUPPORTED_BY, ASSOCIATED_WITH, EVALUATED_BY, SUPERSEDES.

**`data_status` on every record:** `CURATED` (from public information, verify
before citing), `DEMO` (synthetic placeholder — never a real citation) or
`IMPORTED` (policy metadata bulk-imported from the Climate Policy Database;
unreviewed and never linked to evidence).

**Evidence types:** GOVERNMENT_EVALUATION, ACADEMIC_STUDY, OFFICIAL_STATISTICS,
INDUSTRY_REPORT, INSTITUTIONAL_REPORT.

**Causal strength:** DESCRIPTIVE < CORRELATIONAL < QUASI_EXPERIMENTAL <
EXPERIMENTAL / META_ANALYSIS (+ UNKNOWN).

**Claim inference types:** DIRECTLY_SUPPORTED, SYNTHESISED, INFERRED, UNCERTAIN.

## Evidence model & trust rules

- Evidence strength is scored per policy from its linked records —
  `CONTEXT` records (background) and `DEMO` records never count. Counts are
  exposed (`counts.evaluates/monitors/context/demo`).
- Correlation is shown as correlation. Causal labels appear only where the
  cited evidence uses causal methods (EXPERIMENTAL / QUASI_EXPERIMENTAL /
  META_ANALYSIS) — enforced again by the AI guardrails on generated claims.
- Every citation chip in the UI opens the evidence drawer with the full record
  (methodology, findings, limitations, source link or an explicit
  "No verified link" warning).

## AI architecture

- **Provider** (`src/lib/ai/provider.ts`): OpenRouter `chatJSON` with a
  response-format ladder (strict `json_schema` → `json_object` → plain text +
  balanced-brace extraction), one repair turn, 20s timeout, schema validation.
  Never logs keys or full prompts.
- **Retrieval** (`src/lib/ai/retrieval.ts`): lexical scoring over policy text +
  boosts for resolved tech/mech/country hints, selection/compare boosts,
  evidence/outcome coverage and curated-similarity hubness; optional embedding
  blend when `embeddings.json` exists. `formatContextDocument` produces the
  compact sections the prompts consume (~12k tokens cap).
- **Guardrails** (`src/lib/ai/guardrails.ts`): drops citations not in context,
  drops actions referencing unknown ids, rewrites causal-worded claims to
  UNCERTAIN + `[Correlational]` prefix without causal evidence, tags DEMO
  citations. Any failure → deterministic fallback.
- **Fallback** (`src/lib/ai/fallback-content.ts`): lead-authored curated
  answers, token-group matched — the app never dead-ends without the network.
- **UI actions**: the model may return FILTER_GRAPH / FOCUS_COUNTRY /
  HIGHLIGHT_NODES / COMPARE_POLICIES / OPEN_POLICY / SHOW_OUTCOMES /
  SHOW_EVIDENCE / CHANGE_VIEW — applied sequentially so the workspace animates.
- **Policy Transfer**: evidence-based comparison ("not a forecast") via
  `/api/transfer` + TransferView (target jurisdiction, sources, transferability
  badge, lessons as claims, caveats).
- **Evidence Agent** (`/api/evidence-agent`): finds external evidence for a
  policy. With `TAVILY_API_KEY` it runs two Tavily searches per policy,
  filters hits by a relevance guard (the snippet must name the policy), then
  classifies each hit **from its snippet only** into `CANDIDATE` records
  (`ev_cand_*` ids, real source URLs, `confidence: LOW`). Candidates never
  count toward evidence strength, are labelled everywhere, and can be added
  to the workspace from the Evidence panel for the session. Without the key
  the agent returns seeded evidence only.

## Demo mode

`/demo` renders the workspace with a deterministic scenario: the flagship
heat-pump question is answered from the **curated fallback** (no network call),
actions are applied with the staged delays, and a `DEMO` chip sits in the top
bar. Press `?` for the 12-step presenter script. Works fully offline.

The 12 steps: curated answer → citation drawer → highlighted graph → select
BUS/BEG/MPR → comparison → outcomes → map focus → timeline → second question →
policy transfer → ⌘K evidence search.

## Screens

- `/` — landing: hero search, suggested questions, live network preview
- `/workspace` — the analyst workspace: graph, filters, panels, comparison, map, timeline
- `/demo` — deterministic presenter demo of the flagship scenario (works offline)
- `/admin/ingest` — internal ingestion pipeline review UI

## Running locally

```bash
pnpm install
pnpm dev        # http://localhost:3001
```

Node 22+, pnpm 10+. Port 3000 is intentionally avoided.

## Environment variables

| Variable                       | Purpose                                             | Required |
| ------------------------------ | --------------------------------------------------- | -------- |
| `OPENROUTER_API_KEY`           | live LLM (absent → curated fallback mode)            | no       |
| `ANTHROPIC_API_KEY`            | live LLM via the Anthropic Messages API (takes precedence over OpenRouter when set) | no |
| `ANTHROPIC_MODEL`              | Claude model (default `claude-sonnet-4-5`)           | no       |
| `PACT_LLM_PROVIDER`            | force `anthropic` or `openrouter`                    | no       |
| `OPENROUTER_MODEL`             | chat model (default `anthropic/claude-sonnet-4.5`, or free default under FREE_ONLY) | no |
| `OPENROUTER_EMBEDDING_MODEL`   | optional live query embedding model                 | no       |
| `OPENROUTER_FREE_ONLY`         | `true` → refuse non-`:free` models, disable embeddings | no    |
| `OPENROUTER_REASONING`         | `true` → let the model emit reasoning (default off — keeps free models under the timeout) | no |
| `PACT_ANALYST_MODE`            | `live` (default with key) or `fallback` (always curated) | no  |
| `PACT_DATA_SOURCE`             | `supabase` to read from Supabase, else seed         | no       |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase project URL                                | supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| read access (RLS-gated)                             | supabase |
| `SUPABASE_SERVICE_ROLE_KEY`    | seeding + ingest publish                            | server-only |
| `NEXT_PUBLIC_MAPBOX_TOKEN`     | enables the Mapbox GL map (else SVG)                | no       |
| `TAVILY_API_KEY`               | Evidence Agent live web search (Tavily free tier)   | no       |

## LLM provider

`ANTHROPIC_API_KEY` selects the direct Anthropic Messages API (structured output
via forced tool use, `ANTHROPIC_MODEL` to override the default). If
`ANTHROPIC_API_KEY` is absent, `OPENROUTER_API_KEY` is used; `PACT_LLM_PROVIDER`
forces one or the other. Anthropic has no embeddings endpoint — local MiniLM
embeddings are always used.

## OpenRouter configuration

`OPENROUTER_API_KEY` unlocks the live analyst. With `OPENROUTER_FREE_ONLY=true`
the provider refuses any non-`:free` model and disables OpenRouter embeddings.
`pnpm embed` is separate: it generates the seed vectors locally with the free
`Xenova/all-MiniLM-L6-v2` model and does not need an API key.
The provider retries `json_schema` → `json_object` → plain text, then a single
repair turn; failures fall back to curated responses with `source: "FALLBACK"`.

## Supabase setup

1. Create a project and run `supabase/migrations/0001_init.sql` through
   `0004_imported_policies.sql` in order (SQL editor or
   `supabase db push`).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `PACT_DATA_SOURCE=supabase` in `.env.local`.
3. `pnpm seed:supabase` — idempotent upserts of the full seed dataset
   (and embeddings, if generated).
4. Domain tables are anon-readable via RLS; ingest tables are service-only.

## Mapbox (optional)

Set `NEXT_PUBLIC_MAPBOX_TOKEN` to render `react-map-gl` (dark-v11, data-driven
fills). Without it — or on any runtime error — the app falls back to the d3
SVG world map. No token is committed.

## Data ingestion

`/admin/ingest` runs the pipeline SOURCE → TEXT EXTRACTION → CHUNKING →
POLICY/ENTITY/RELATIONSHIP EXTRACTION → EMBEDDINGS → SIMILARITY → HUMAN REVIEW →
PUBLISH. URL/PDF/text inputs; per-chunk extraction with provenance quotes; a
human reviews every field before publish. Limitations: no background queue
(jobs are in-memory, lost on restart), publish in seed mode is in-memory only,
no auth on the admin route (internal use).

### Climate Policy Database import

`pnpm import:cpdb` pulls building and heating policies for PACT's 13
jurisdictions from NewClimate Institute's free public
[Climate Policy Database](https://climatepolicydatabase.org/) API (no key) and
writes `src/data/seed/cpdb.json`. National records only (sub-national ones
rarely match a PACT jurisdiction), with records PACT already curates dropped.
Mechanisms map from CPDB instrument types; technologies come only from each
record's own name and description. Imported policies are hidden until the
workspace **Sources** filter includes them. Afterwards run `pnpm embed`
(local, free) and, for Supabase, `pnpm seed:supabase`. CPDB data is
CC BY-NC 4.0: attribute NewClimate Institute and keep use non-commercial.

## Similarity engine

`structuredSimilarity` scores technology/mechanism/sector/target overlap,
jurisdiction proximity and semantic similarity with weights of technology 0.25,
mechanism 0.25, sector 0.1, target 0.1, jurisdiction 0.1 and semantic 0.2.
`pnpm embed` uses the local
`Xenova/all-MiniLM-L6-v2` model to write 384-dimensional vectors to
`embeddings.json` and semantic scores for every policy pair to `semantic.ts`.
Computed semantic scores stay separate from graph similarities, and curated
pairs always override computed values. Runtime-published policies fall back to
lexical Jaccard when no generated pair score exists.
`explainSimilarity` renders the 7-row breakdown used in the SIMILARITY panel,
the ingest review and similarity tooling.

## Search

Catalogue search uses a cached MiniSearch BM25 index with fuzzy and prefix
matching over policies, evidence, jurisdictions, technologies and mechanisms.
Published source documents are searchable by their extracted full text in the
command palette and through `GET /api/search?q=...`. Supabase uses the
full-text search function and GIN index from migration 0003. In seed mode,
source documents are held in memory and are lost when the server restarts.

## Testing

```bash
pnpm test        # vitest — unit (domain, graph, retrieval, guardrails, ingest, provider)
pnpm test:e2e    # playwright — landing nav, offline fallback, 12-step demo flow
pnpm tsc --noEmit && pnpm lint
```

## Deployment

Next.js App Router; API routes run on the Node.js runtime (provider + Supabase).
Set all env vars in the host. `pnpm build` produces the production build.

## Data provenance & honesty

The seed catalogue lives in `docs/seed-catalogue.md`. `CURATED` records are
assembled from public information — **verify figures before citing**.
`DEMO` records are synthetic and labelled everywhere they appear. `IMPORTED`
policies come from the Climate Policy Database (NewClimate Institute,
CC BY-NC 4.0), carry a CPDB label and source links, and never count as
evidence. PACT never
presents an estimate as a measurement; if there's no record, the product says
"insufficient evidence".

## Roadmap / not built

- Live evidence search adapter (the `EvidenceSearchAdapter` seam exists).
- Persistent ingest queue + authenticated admin.
- Multi-source comparison beyond 4 policies; export/share states.
- Semantic similarity across the live corpus (embeddings disabled under FREE_ONLY).
