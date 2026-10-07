-- 0003: full-text search over ingested source documents, and 384-dim
-- embeddings from the local all-MiniLM-L6-v2 model (`pnpm embed`).

-- Embedding tables hold derived data only; regenerate with
-- `pnpm embed && pnpm seed:supabase`.
drop function if exists match_policies (vector, int);
drop table if exists policy_embeddings;
drop table if exists evidence_embeddings;

create table policy_embeddings (
  policy_id text primary key references policies (id),
  embedding vector(384) not null,
  model text not null,
  updated_at timestamptz not null default now()
);

create table evidence_embeddings (
  evidence_id text primary key references evidence (id),
  embedding vector(384) not null,
  model text not null,
  updated_at timestamptz not null default now()
);

create index policy_embeddings_vec_idx on policy_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 16);
create index evidence_embeddings_vec_idx on evidence_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 16);

alter table policy_embeddings enable row level security;
alter table evidence_embeddings enable row level security;

create or replace function match_policies (
  query_embedding vector(384),
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

-- source documents: the full extracted text of a published ingest source
alter table ingest_sources
  add column policy_id text references policies (id) on delete set null;
alter table ingest_sources
  add column fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(label, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(raw_text, '')), 'B')
  ) stored;

create index ingest_sources_fts_idx on ingest_sources using gin (fts);
create index ingest_sources_policy_id_idx on ingest_sources (policy_id);

-- ingest_sources has RLS with no anon policy, so only the service role sees rows
create or replace function search_documents (
  query text,
  match_count int default 10
) returns table (id uuid, policy_id text, label text, url text, snippet text, rank real)
language sql stable
as $$
  select s.id,
         s.policy_id,
         s.label,
         s.url,
         ts_headline('english', coalesce(s.raw_text, ''), q,
           'MaxFragments=1, MaxWords=35, MinWords=15, StartSel="", StopSel=""') as snippet,
         ts_rank(s.fts, q) as rank
  from ingest_sources s, websearch_to_tsquery('english', query) q
  where s.policy_id is not null and s.fts @@ q
  order by rank desc
  limit match_count;
$$;
