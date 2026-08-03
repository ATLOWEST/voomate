-- =============================================================================
-- Retrieval — the vector index and the query that uses it.
--
-- Apply AFTER the generated schema migration and 10_rls_policies.sql.
-- Background: docs/adr/0005-supabase-pgvector.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The index.
--
-- HNSW rather than IVFFlat: IVFFlat must be built against existing data to pick
-- its lists, and our table starts empty and grows continuously as merchants
-- onboard. HNSW needs no such training pass and degrades more gracefully as rows
-- arrive.
--
-- Cosine distance (`vector_cosine_ops`) matches how Titan Embed v2 output is
-- compared. Using L2 here against unnormalised embeddings would rank by magnitude
-- as much as by meaning.
--
-- m / ef_construction are pgvector's defaults, stated explicitly so that a future
-- change is visibly a decision rather than a drifted default. Raising them costs
-- build time and memory to buy recall.
-- -----------------------------------------------------------------------------
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- -----------------------------------------------------------------------------
-- The retrieval query.
--
-- Scoped by BOTH organization_id and agent_id. The agent scope is the product
-- requirement; the organization scope is the safety net. Passing only agent_id
-- would still be correct today — agents belong to exactly one org — but it would
-- mean a single bad UUID anywhere upstream could read another tenant's corpus.
-- Requiring both means an attacker needs two correct secrets, not one.
--
-- SECURITY INVOKER (the default, stated by omission). This function must NOT be
-- SECURITY DEFINER: the API already connects as the service role, and a definer
-- function would additionally hand RLS bypass to any anon-key caller who can
-- reach it. Callers get exactly the visibility their own role has.
--
-- hnsw.iterative_scan is the setting 00_extensions.sql version-gates on. With a
-- WHERE clause on agent_id, a plain HNSW scan collects its candidate set first and
-- filters second, so a tenant holding a small share of the table can lose most of
-- its results. `relaxed_order` lets the scan keep pulling candidates until the
-- limit is genuinely satisfied, trading strict distance ordering for recall — the
-- right trade when the consumer re-ranks by similarity anyway.
-- -----------------------------------------------------------------------------
create or replace function public.match_knowledge_chunks(
  p_organization_id uuid,
  p_agent_id uuid,
  p_query_embedding extensions.vector(1024),
  p_match_count integer default 8,
  p_min_similarity double precision default 0.25
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source_url text,
  source_title text,
  language text,
  ordinal integer,
  similarity double precision
)
language sql
stable
parallel safe
set search_path = public, extensions
set hnsw.iterative_scan = 'relaxed_order'
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.source_url,
    c.source_title,
    c.language,
    c.ordinal,
    1 - (c.embedding operator(extensions.<=>) p_query_embedding) as similarity
  from public.knowledge_chunks c
  where c.organization_id = p_organization_id
    and c.agent_id = p_agent_id
    and 1 - (c.embedding operator(extensions.<=>) p_query_embedding) >= p_min_similarity
  order by c.embedding operator(extensions.<=>) p_query_embedding
  -- Clamped rather than validated: this is on the hot path of every answer, and a
  -- caller asking for 10,000 chunks is a bug we should survive, not honour.
  limit least(greatest(p_match_count, 1), 50)
$$;

comment on function public.match_knowledge_chunks is
  'Nearest chunks for a query embedding, scoped to one agent within one organization. '
  'Returns cosine similarity in [0,1]; callers treat a weak best match as grounds to '
  'refuse rather than to answer — see docs/security.md.';

-- The anon role must never reach the corpus directly; retrieval happens through the
-- API, which applies the agent's own origin and token checks first. Revoking here
-- means a leaked anon key cannot enumerate a merchant's site content one query at a
-- time, which RLS alone would permit for a user who is a member of the org.
revoke all on function public.match_knowledge_chunks from anon;
