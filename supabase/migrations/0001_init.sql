-- PACT initial schema. Mirrors src/lib/domain/schema.ts (Dataset).
-- Keep enum CHECK lists in sync with the Zod enums; supabase/migrations.test.ts
-- guards the drift-critical ones.

create extension if not exists vector;

create table jurisdictions (
  id text primary key,
  name text not null,
  country_code text not null check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'EU')),
  level text not null check (level in ('NATIONAL', 'STATE', 'CITY', 'SUPRANATIONAL')),
  parent_id text references jurisdictions (id),
  lat double precision not null,
  lng double precision not null,
  context jsonb not null default '{}'::jsonb,
  data_status text not null default 'CURATED' check (data_status in ('CURATED', 'DEMO'))
);

create table technologies (
  id text primary key,
  name text not null,
  description text not null
);

create table mechanisms (
  id text primary key,
  kind text not null check (kind in (
    'GRANT', 'TAX_CREDIT', 'LOAN', 'LOAN_GUARANTEE', 'OBLIGATION',
    'STANDARD', 'BAN', 'CARBON_PRICE', 'INFORMATION', 'DIRECT_INVESTMENT', 'TARGET'
  )),
  name text not null,
  description text not null
);

create table metrics (
  id text primary key,
  name text not null,
  unit text not null,
  description text not null,
  higher_is_better boolean not null
);

create table policies (
  id text primary key,
  name text not null,
  short_name text,
  jurisdiction_id text not null references jurisdictions (id),
  country_code text not null check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'EU')),
  status text not null check (status in ('ACTIVE', 'CLOSED', 'ANNOUNCED', 'SUPERSEDED', 'PAUSED')),
  introduced text not null,
  ended text,
  sector text not null check (sector in ('RESIDENTIAL_BUILDINGS', 'COMMERCIAL_BUILDINGS', 'PUBLIC_BUILDINGS', 'ALL_BUILDINGS')),
  technology_ids text[] not null default '{}',
  mechanism_ids text[] not null default '{}',
  target_groups text[] not null default '{}',
  eligibility text not null,
  incentive text not null,
  funding text not null,
  objectives text[] not null default '{}',
  description text not null,
  implementation_notes text,
  limitations text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  data_status text not null check (data_status in ('CURATED', 'DEMO')),
  tags text[] not null default '{}'
);

create table evidence (
  id text primary key,
  title text not null,
  publisher text not null,
  authors text[] not null default '{}',
  publication_date text not null,
  source_url text,
  evidence_type text not null check (evidence_type in (
    'GOVERNMENT_EVALUATION', 'ACADEMIC_STUDY', 'OFFICIAL_STATISTICS',
    'INDUSTRY_REPORT', 'INSTITUTIONAL_REPORT'
  )),
  methodology text not null,
  geography text[] not null default '{}',
  policy_ids text[] not null default '{}',
  policy_relevance text not null default 'MONITORS' check (policy_relevance in ('EVALUATES', 'MONITORS', 'CONTEXT')),
  metrics text[] not null default '{}',
  findings text[] not null default '{}',
  limitations text[] not null default '{}',
  confidence text not null check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  causal_strength text not null check (causal_strength in (
    'DESCRIPTIVE', 'CORRELATIONAL', 'QUASI_EXPERIMENTAL', 'EXPERIMENTAL', 'META_ANALYSIS', 'UNKNOWN'
  )),
  data_status text not null check (data_status in ('CURATED', 'DEMO'))
);

create table outcomes (
  id text primary key,
  policy_id text not null references policies (id),
  metric_id text not null references metrics (id),
  headline text not null,
  direction text not null check (direction in ('UP', 'DOWN', 'FLAT', 'MIXED')),
  magnitude text,
  period text not null,
  inference text not null check (inference in ('CAUSAL', 'CORRELATIONAL', 'DESCRIPTIVE')),
  evidence_ids text[] not null default '{}',
  note text,
  data_status text not null check (data_status in ('CURATED', 'DEMO'))
);

create table time_series (
  id text primary key,
  metric_id text not null references metrics (id),
  country_code text not null check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'EU')),
  jurisdiction_id text not null references jurisdictions (id),
  points jsonb not null default '[]'::jsonb,
  source_evidence_id text references evidence (id),
  precision text not null check (precision in ('REPORTED', 'APPROXIMATE', 'ILLUSTRATIVE')),
  data_status text not null check (data_status in ('CURATED', 'DEMO')),
  note text
);

create table similarities (
  id text primary key,
  policy_a text not null references policies (id),
  policy_b text not null references policies (id),
  breakdown jsonb not null
);

create table policy_embeddings (
  policy_id text primary key references policies (id),
  embedding vector(1536) not null,
  model text not null,
  updated_at timestamptz not null default now()
);

create table evidence_embeddings (
  evidence_id text primary key references evidence (id),
  embedding vector(1536) not null,
  model text not null,
  updated_at timestamptz not null default now()
);

create table ingest_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('URL', 'PDF', 'TEXT')),
  label text,
  url text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ingest_sources (id),
  status text not null default 'EXTRACTED' check (status in ('EXTRACTED', 'IN_REVIEW', 'PUBLISHED', 'REJECTED')),
  extraction jsonb,
  provenance jsonb,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes
create index policies_country_code_idx on policies (country_code);
create index evidence_policy_ids_idx on evidence using gin (policy_ids);
create index policy_embeddings_vec_idx on policy_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 16);
create index evidence_embeddings_vec_idx on evidence_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 16);

-- row-level security: domain tables are publicly readable, ingest tables are
-- service-role only (no policies for anon at all).
alter table jurisdictions enable row level security;
alter table technologies enable row level security;
alter table mechanisms enable row level security;
alter table metrics enable row level security;
alter table policies enable row level security;
alter table evidence enable row level security;
alter table outcomes enable row level security;
alter table time_series enable row level security;
alter table similarities enable row level security;
alter table policy_embeddings enable row level security;
alter table evidence_embeddings enable row level security;
alter table ingest_sources enable row level security;
alter table ingest_jobs enable row level security;

create policy "jurisdictions_read" on jurisdictions for select to anon using (true);
create policy "technologies_read" on technologies for select to anon using (true);
create policy "mechanisms_read" on mechanisms for select to anon using (true);
create policy "metrics_read" on metrics for select to anon using (true);
create policy "policies_read" on policies for select to anon using (true);
create policy "evidence_read" on evidence for select to anon using (true);
create policy "outcomes_read" on outcomes for select to anon using (true);
create policy "time_series_read" on time_series for select to anon using (true);
create policy "similarities_read" on similarities for select to anon using (true);

-- vector search over policy embeddings
create or replace function match_policies (
  query_embedding vector(1536),
  match_count int default 10
) returns table (policy_id text, similarity float)
language sql stable
as $$
  select pe.policy_id,
         1 - (pe.embedding <=> query_embedding) as similarity
  from policy_embeddings pe
  order by pe.embedding <=> query_embedding
  limit match_count;
$$;
