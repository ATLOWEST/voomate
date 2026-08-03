-- =============================================================================
-- Extensions — runs BEFORE everything else, including the generated schema.
--
-- `knowledge_chunks.embedding` is of type `vector`, so pgvector must exist before
-- the generated migration creates that table. This is the one file that cannot be
-- reordered.
--
-- Supabase installs extensions into the `extensions` schema, which is already on
-- the default search_path for the roles we connect as. Anything that pins its own
-- search_path (SECURITY DEFINER functions, notably) must therefore include it
-- explicitly — see 20_pgvector_retrieval.sql.
-- =============================================================================

create extension if not exists vector with schema extensions;

-- pgvector 0.8.0 introduced iterative index scans. We depend on them: retrieval
-- always filters by agent_id, and without iterative scans an HNSW search returns
-- the globally nearest chunks and *then* discards the ones belonging to other
-- tenants — which on a shared table means a small tenant can get back far fewer
-- results than asked for, or none at all, while the index reports success.
--
-- Failing loudly here is much cheaper than debugging quietly-empty retrieval.
do $$
declare
  installed text;
begin
  select extversion into installed from pg_extension where extname = 'vector';

  if installed is null then
    raise exception 'pgvector is not installed';
  end if;

  if string_to_array(installed, '.')::int[] < array[0, 8, 0] then
    raise exception
      'pgvector % is too old — 0.8.0+ is required for iterative index scans. '
      'Without them, multi-tenant retrieval silently under-returns.', installed;
  end if;
end
$$;
