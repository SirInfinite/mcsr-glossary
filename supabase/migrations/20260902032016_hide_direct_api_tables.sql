begin;

create or replace function private.get_glossary_vote_totals()
returns table (
    term_id uuid,
    upvotes bigint,
    downvotes bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
    select totals.term_id, totals.upvotes, totals.downvotes
    from public.glossary_vote_totals as totals
    order by totals.term_id;
$function$;

create or replace function public.get_glossary_vote_totals()
returns table (
    term_id uuid,
    upvotes bigint,
    downvotes bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
    select * from private.get_glossary_vote_totals();
$function$;

revoke all on function private.get_glossary_vote_totals() from public, anon, authenticated, service_role;
revoke all on function public.get_glossary_vote_totals() from public, anon, authenticated, service_role;
grant usage on schema private to anon;
grant execute on function private.get_glossary_vote_totals() to anon;
grant execute on function public.get_glossary_vote_totals() to anon;

-- Public clients read totals only through the read-only RPC, so the table does
-- not need to be discoverable through the REST or GraphQL table APIs.
revoke select on table public.glossary_vote_totals from anon;
drop policy if exists anonymous_read_glossary_vote_totals on public.glossary_vote_totals;

-- Explicit false policies document the deny-all posture while table grants
-- remain revoked. Privileged implementations owned by postgres bypass these
-- policies only for their narrow RPC operations.
drop policy if exists deny_anon_direct_access on public.glossary_vote_totals;
create policy deny_anon_direct_access
    on public.glossary_vote_totals
    as restrictive
    for all
    to anon
    using (false)
    with check (false);

drop policy if exists deny_anon_direct_access on public.glossary_vote_receipts;
create policy deny_anon_direct_access
    on public.glossary_vote_receipts
    as restrictive
    for all
    to anon
    using (false)
    with check (false);

drop policy if exists deny_anon_direct_access on public.glossary_submissions;
create policy deny_anon_direct_access
    on public.glossary_submissions
    as restrictive
    for all
    to anon
    using (false)
    with check (false);

do $legacy$
begin
    if to_regclass('public.votes') is not null then
        execute 'drop policy if exists deny_anon_direct_access on public.votes';
        execute 'create policy deny_anon_direct_access on public.votes as restrictive for all to anon using (false) with check (false)';
    end if;

    if to_regclass('public.submissions') is not null then
        execute 'drop policy if exists deny_anon_direct_access on public.submissions';
        execute 'create policy deny_anon_direct_access on public.submissions as restrictive for all to anon using (false) with check (false)';
    end if;
end;
$legacy$;

comment on function public.get_glossary_vote_totals() is 'Anonymous read-only RPC for aggregate canonical glossary vote counts.';

notify pgrst, 'reload schema';

commit;

