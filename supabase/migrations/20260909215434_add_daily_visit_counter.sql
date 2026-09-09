begin;

-- One aggregate row per UTC day keeps the public metric compact. Individual
-- receipt rows provide weak duplicate friction without storing browser IDs.
create table public.glossary_daily_visit_totals (
    visit_date date primary key,
    visits bigint not null default 0,
    updated_at timestamptz not null default pg_catalog.now(),
    constraint glossary_daily_visit_totals_nonnegative check (visits >= 0)
);

create table public.glossary_daily_visit_receipts (
    visit_date date not null references public.glossary_daily_visit_totals(visit_date) on delete cascade,
    visitor_hash bytea not null,
    created_at timestamptz not null default pg_catalog.now(),
    primary key (visit_date, visitor_hash),
    constraint glossary_daily_visit_receipts_hash_length check (octet_length(visitor_hash) = 32)
);

alter table public.glossary_daily_visit_totals enable row level security;
alter table public.glossary_daily_visit_receipts enable row level security;

revoke all on table public.glossary_daily_visit_totals from public, anon, authenticated;
revoke all on table public.glossary_daily_visit_receipts from public, anon, authenticated;
grant all on table public.glossary_daily_visit_totals to service_role;
grant all on table public.glossary_daily_visit_receipts to service_role;

create policy deny_public_direct_access
    on public.glossary_daily_visit_totals
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);

create policy deny_public_direct_access
    on public.glossary_daily_visit_receipts
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);

create or replace function private.record_glossary_visit(p_browser_id uuid)
returns table (
    visit_date date,
    daily_visits bigint,
    total_visits bigint,
    recorded boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_visit_date date := pg_catalog.timezone('UTC', pg_catalog.statement_timestamp())::date;
    v_visitor_hash bytea;
    v_daily_visits bigint;
    v_total_visits bigint;
    v_inserted_rows integer := 0;
    v_recorded boolean := false;
begin
    if p_browser_id is null or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;

    -- Including the date makes the stored hash unlinkable across daily rows.
    -- Clearing browser storage or choosing another UUID can still count again.
    v_visitor_hash := extensions.digest(p_browser_id::text || ':' || v_visit_date::text, 'sha256');

    insert into public.glossary_daily_visit_totals (visit_date)
    values (v_visit_date)
    on conflict on constraint glossary_daily_visit_totals_pkey do nothing;

    select totals.visits
      into v_daily_visits
      from public.glossary_daily_visit_totals as totals
     where totals.visit_date = v_visit_date
     for update;

    insert into public.glossary_daily_visit_receipts (visit_date, visitor_hash)
    values (v_visit_date, v_visitor_hash)
    on conflict on constraint glossary_daily_visit_receipts_pkey do nothing;

    get diagnostics v_inserted_rows = row_count;
    v_recorded := v_inserted_rows = 1;

    if v_recorded then
        update public.glossary_daily_visit_totals as totals
           set visits = totals.visits + 1,
               updated_at = pg_catalog.now()
         where totals.visit_date = v_visit_date
         returning totals.visits into v_daily_visits;
    end if;

    select coalesce(sum(totals.visits), 0)
      into v_total_visits
      from public.glossary_daily_visit_totals as totals;

    return query select v_visit_date, v_daily_visits, v_total_visits, v_recorded;
end;
$function$;

create or replace function public.record_glossary_visit(p_browser_id uuid)
returns table (
    visit_date date,
    daily_visits bigint,
    total_visits bigint,
    recorded boolean
)
language sql
security invoker
set search_path = ''
as $function$
    select * from private.record_glossary_visit(p_browser_id);
$function$;

revoke all on function private.record_glossary_visit(uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_glossary_visit(uuid) from public, anon, authenticated, service_role;
grant usage on schema private to anon;
grant execute on function private.record_glossary_visit(uuid) to anon;
grant execute on function public.record_glossary_visit(uuid) to anon;

comment on table public.glossary_daily_visit_totals is 'Private UTC daily visit totals; anonymous clients use record_glossary_visit.';
comment on table public.glossary_daily_visit_receipts is 'Private daily duplicate receipts keyed by a date-scoped SHA-256 browser hash.';
comment on function public.record_glossary_visit(uuid) is 'Records at most one visit per browser UUID per UTC day and returns daily and cumulative totals.';

notify pgrst, 'reload schema';

commit;
