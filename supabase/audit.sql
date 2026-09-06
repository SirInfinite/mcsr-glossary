-- Read-only inspection. Run through authenticated Supabase MCP execute_sql.
select version, name from supabase_migrations.schema_migrations order by version;
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
select schemaname, tablename, policyname, roles, cmd, permissive, qual, with_check
from pg_policies where schemaname in ('public','private') order by tablename,policyname;
select grantee, table_schema, table_name, privilege_type from information_schema.role_table_grants
where table_schema='public' order by table_name,grantee,privilege_type;
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') order by n.nspname,p.proname;
select schemaname, tablename, indexname, indexdef from pg_indexes
where schemaname in ('public','private') order by tablename,indexname;
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers where trigger_schema in ('public','private') order by event_object_table;
-- Compatible with the pre-overhaul schema: a nonzero difference may be a
-- historical import, not corruption. Confirm provenance before any migration.
select t.term_id, t.upvotes, t.downvotes,
    (select count(*) from public.glossary_vote_receipts r where r.term_id=t.term_id and direction='up') as receipt_upvotes,
    (select count(*) from public.glossary_vote_receipts r where r.term_id=t.term_id and direction='down') as receipt_downvotes
from public.glossary_vote_totals t order by t.term_id;
