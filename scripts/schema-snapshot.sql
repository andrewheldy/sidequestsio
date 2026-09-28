-- schema-snapshot.sql — read-only dump of the live public schema as one JSON document
--
-- Run in the Supabase SQL editor (or via the read-only MCP). Copy the single
-- `snapshot` cell and diff it against docs/architecture/DATABASE_SCHEMA_SNAPSHOT.md,
-- or paste it to an LLM together with that file. This script mutates nothing.

with
cols as (
  select c.table_name,
         jsonb_agg(jsonb_build_object(
           'name', c.column_name,
           'type', case when c.data_type = 'USER-DEFINED' then c.udt_name else c.data_type end,
           'nullable', c.is_nullable = 'YES',
           'default', c.column_default
         ) order by c.ordinal_position) as columns
    from information_schema.columns c
   where c.table_schema = 'public'
   group by c.table_name
),
cons as (
  select cl.relname as table_name,
         jsonb_agg(jsonb_build_object(
           'name', co.conname,
           'type', co.contype,          -- p=primary, f=foreign, u=unique, c=check
           'def', pg_get_constraintdef(co.oid)
         ) order by co.contype, co.conname) as constraints
    from pg_constraint co
    join pg_class cl on cl.oid = co.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
   where n.nspname = 'public'
   group by cl.relname
),
pols as (
  select tablename as table_name,
         jsonb_agg(jsonb_build_object(
           'name', policyname, 'cmd', cmd, 'roles', roles,
           'using', qual, 'check', with_check
         ) order by policyname) as policies
    from pg_policies
   where schemaname = 'public'
   group by tablename
),
grants as (
  select table_name,
         jsonb_object_agg(grantee, privs) as grants
    from (
      select table_name, grantee, jsonb_agg(privilege_type order by privilege_type) as privs
        from information_schema.role_table_grants
       where table_schema = 'public' and grantee in ('anon', 'authenticated')
       group by table_name, grantee
    ) g
   group by table_name
),
col_grants as (
  select table_name,
         jsonb_agg(jsonb_build_object('grantee', grantee, 'column', column_name, 'priv', privilege_type)
                   order by grantee, column_name) as column_grants
    from information_schema.column_privileges
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
     and (table_name, grantee, privilege_type) not in (
       select table_name, grantee, privilege_type
         from information_schema.role_table_grants
        where table_schema = 'public')
   group by table_name
),
rels as (
  select cl.relname as name,
         case cl.relkind when 'r' then 'table' when 'v' then 'view' when 'm' then 'matview' end as kind,
         cl.relrowsecurity as rls_enabled,
         case when cl.relkind = 'v' then pg_get_viewdef(cl.oid, true) end as view_def,
         cl.reloptions as options
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
   where n.nspname = 'public' and cl.relkind in ('r', 'v', 'm')
)
select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'relations', (
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'name', r.name, 'kind', r.kind, 'rls_enabled', r.rls_enabled,
             'options', r.options, 'view_def', r.view_def,
             'columns', c.columns, 'constraints', k.constraints,
             'policies', p.policies, 'grants', g.grants, 'column_grants', cg.column_grants
           )) order by r.kind, r.name)
      from rels r
      left join cols c on c.table_name = r.name
      left join cons k on k.table_name = r.name
      left join pols p on p.table_name = r.name
      left join grants g on g.table_name = r.name
      left join col_grants cg on cg.table_name = r.name
  ),
  'enums', (
    select jsonb_object_agg(t.typname, labels)
      from (
        select t.typname, jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
          from pg_type t
          join pg_enum e on e.enumtypid = t.oid
          join pg_namespace n on n.oid = t.typnamespace
         where n.nspname = 'public'
         group by t.typname
      ) t
  ),
  'functions', (
    select jsonb_agg(jsonb_build_object(
             'name', p.proname,
             'args', pg_get_function_arguments(p.oid),
             'returns', pg_get_function_result(p.oid),
             'security_definer', p.prosecdef
           ) order by p.proname)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (            -- skip extension-owned functions (e.g. pgcrypto)
         select 1 from pg_depend d
          where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  ),
  'triggers', (
    select jsonb_agg(jsonb_build_object(
             'name', t.tgname,
             'table', n.nspname || '.' || c.relname,
             'def', pg_get_triggerdef(t.oid)
           ) order by n.nspname, c.relname, t.tgname)
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where not t.tgisinternal and n.nspname in ('public', 'auth')
  ),
  'indexes', (
    select jsonb_agg(indexdef order by tablename, indexname)
      from pg_indexes where schemaname = 'public'
  ),
  'buckets', (
    select jsonb_agg(jsonb_build_object(
             'id', id, 'public', public,
             'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types
           ) order by id)
      from storage.buckets
  ),
  'row_counts', (
    select jsonb_object_agg(relname, n_live_tup)
      from pg_stat_user_tables where schemaname = 'public'
  )
)) as snapshot;
