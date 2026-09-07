begin;

create table public.glossary_term_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_hash bytea not null,
    term_id uuid not null references public.glossary_vote_totals(term_id) on delete restrict,
    term_name text not null,
    reason text not null,
    details text,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    moderation_notes text,
    constraint glossary_term_reports_hash_length check (octet_length(reporter_hash) = 32),
    constraint glossary_term_reports_term_name_length check (
        term_name = btrim(term_name)
        and char_length(term_name) between 2 and 100
    ),
    constraint glossary_term_reports_reason check (
        reason in ('inaccurate', 'inappropriate', 'broken_media', 'spam', 'other')
    ),
    constraint glossary_term_reports_details_length check (
        details is null
        or (details = btrim(details) and char_length(details) between 10 and 2000)
    ),
    constraint glossary_term_reports_other_details check (
        reason <> 'other' or details is not null
    ),
    constraint glossary_term_reports_status check (
        status in ('pending', 'resolved', 'dismissed')
    ),
    constraint glossary_term_reports_moderation_notes_length check (
        moderation_notes is null or char_length(moderation_notes) <= 2000
    ),
    constraint glossary_term_reports_review_state check (
        (status = 'pending' and reviewed_at is null)
        or (status in ('resolved', 'dismissed') and reviewed_at is not null)
    )
);

create index glossary_term_reports_moderation_queue
    on public.glossary_term_reports (status, created_at);

create index glossary_term_reports_reporter_activity
    on public.glossary_term_reports (reporter_hash, created_at desc);

create unique index glossary_term_reports_one_pending_per_term
    on public.glossary_term_reports (reporter_hash, term_id)
    where status = 'pending';

alter table public.glossary_term_reports enable row level security;

revoke all on table public.glossary_term_reports from public, anon, authenticated;
grant all on table public.glossary_term_reports to service_role;

create policy deny_public_direct_access
    on public.glossary_term_reports
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);

create or replace function private.submit_glossary_term_report(
    p_browser_id uuid,
    p_term_id uuid,
    p_term_name text,
    p_reason text,
    p_details text,
    p_website text
)
returns table (
    report_id uuid,
    report_status text,
    created boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_reporter_hash bytea;
    v_term_name text := btrim(coalesce(p_term_name, ''));
    v_reason text := lower(btrim(coalesce(p_reason, '')));
    v_details text := nullif(btrim(coalesce(p_details, '')), '');
    v_report_id uuid;
begin
    if btrim(coalesce(p_website, '')) <> '' then
        raise exception using errcode = '22023', message = 'Report rejected.';
    end if;
    if p_browser_id is null
        or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;
    if p_term_id is null
        or not exists (
            select 1
            from public.glossary_vote_totals as target
            where target.term_id = p_term_id
        ) then
        raise exception using errcode = '22023', message = 'Unknown glossary term.';
    end if;
    if char_length(v_term_name) not between 2 and 100 then
        raise exception using errcode = '22023', message = 'Term name must be between 2 and 100 characters.';
    end if;
    if v_reason not in ('inaccurate', 'inappropriate', 'broken_media', 'spam', 'other') then
        raise exception using errcode = '22023', message = 'Choose a supported report reason.';
    end if;
    if v_details is not null and char_length(v_details) not between 10 and 2000 then
        raise exception using errcode = '22023', message = 'Report details must be between 10 and 2000 characters.';
    end if;
    if v_reason = 'other' and v_details is null then
        raise exception using errcode = '22023', message = 'Details are required for an other report.';
    end if;

    v_reporter_hash := extensions.digest(p_browser_id::text, 'sha256');

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(pg_catalog.encode(v_reporter_hash, 'hex'), 0)
    );

    select report.id
      into v_report_id
      from public.glossary_term_reports as report
     where report.reporter_hash = v_reporter_hash
       and report.term_id = p_term_id
       and report.status = 'pending';

    if found then
        return query select v_report_id, 'pending'::text, false;
        return;
    end if;

    if exists (
        select 1
          from public.glossary_term_reports as report
         where report.reporter_hash = v_reporter_hash
           and report.created_at > pg_catalog.now() - interval '30 seconds'
    ) then
        raise exception using errcode = 'P0001', message = 'Please wait before reporting another term.';
    end if;

    if (
        select count(*)
          from public.glossary_term_reports as report
         where report.reporter_hash = v_reporter_hash
           and report.status = 'pending'
    ) >= 5 then
        raise exception using errcode = 'P0001', message = 'This browser already has the maximum number of pending reports.';
    end if;

    insert into public.glossary_term_reports (
        reporter_hash,
        term_id,
        term_name,
        reason,
        details
    ) values (
        v_reporter_hash,
        p_term_id,
        v_term_name,
        v_reason,
        v_details
    )
    returning id into v_report_id;

    return query select v_report_id, 'pending'::text, true;
end;
$function$;

create or replace function public.submit_glossary_term_report(
    p_browser_id uuid,
    p_term_id uuid,
    p_term_name text,
    p_reason text,
    p_details text,
    p_website text
)
returns table (
    report_id uuid,
    report_status text,
    created boolean
)
language sql
security invoker
set search_path = ''
as $function$
    select *
      from private.submit_glossary_term_report(
          p_browser_id,
          p_term_id,
          p_term_name,
          p_reason,
          p_details,
          p_website
      );
$function$;

revoke all on function private.submit_glossary_term_report(uuid, uuid, text, text, text, text)
    from public, anon, authenticated, service_role;
revoke all on function public.submit_glossary_term_report(uuid, uuid, text, text, text, text)
    from public, anon, authenticated, service_role;

grant usage on schema private to anon;
grant execute on function private.submit_glossary_term_report(uuid, uuid, text, text, text, text) to anon;
grant execute on function public.submit_glossary_term_report(uuid, uuid, text, text, text, text) to anon;

comment on table public.glossary_term_reports is
    'Private moderation queue for published-term reports; browser UUIDs are stored only as SHA-256 hashes.';
comment on function public.submit_glossary_term_report(uuid, uuid, text, text, text, text) is
    'Validates and queues a private report for one canonical glossary term without exposing report rows.';

notify pgrst, 'reload schema';

commit;
