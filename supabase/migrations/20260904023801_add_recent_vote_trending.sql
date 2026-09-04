begin;

-- Track the last meaningful state change for each active browser vote. Existing
-- receipts retain their original vote time so deploying this migration does not
-- make old activity appear recent.
alter table public.glossary_vote_receipts
    add column if not exists updated_at timestamptz;

update public.glossary_vote_receipts
   set updated_at = created_at
 where updated_at is null;

alter table public.glossary_vote_receipts
    alter column updated_at set default pg_catalog.now(),
    alter column updated_at set not null;

create index if not exists glossary_vote_receipts_recent_activity
    on public.glossary_vote_receipts (updated_at desc)
    include (term_id, direction);

-- Keep reversible voting atomic while recording only real state changes as
-- recent activity. Re-selecting the current state remains a no-op.
create or replace function private.set_glossary_vote(
    p_term_id uuid,
    p_browser_id uuid,
    p_vote smallint
)
returns table (
    changed boolean,
    current_vote smallint,
    upvotes bigint,
    downvotes bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_voter_hash bytea;
    v_previous_vote smallint := 0;
    v_upvotes bigint;
    v_downvotes bigint;
begin
    if p_term_id is null then
        raise exception using errcode = '22023', message = 'A glossary term ID is required.';
    end if;
    if p_browser_id is null
        or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;
    if p_vote is null or p_vote not in (-1, 0, 1) then
        raise exception using errcode = '22023', message = 'Vote must be -1, 0, or 1.';
    end if;

    v_voter_hash := extensions.digest(p_browser_id::text, 'sha256');

    select totals.upvotes, totals.downvotes
      into v_upvotes, v_downvotes
      from public.glossary_vote_totals as totals
     where totals.term_id = p_term_id
       for update;

    if not found then
        raise exception using errcode = '22023', message = 'Unknown glossary term.';
    end if;

    select case receipt.direction
               when 'up' then 1::smallint
               when 'down' then -1::smallint
               else 0::smallint
           end
      into v_previous_vote
      from public.glossary_vote_receipts as receipt
     where receipt.term_id = p_term_id
       and receipt.voter_hash = v_voter_hash;

    v_previous_vote := coalesce(v_previous_vote, 0::smallint);

    if v_previous_vote = p_vote then
        return query select false, p_vote, v_upvotes, v_downvotes;
        return;
    end if;

    if p_vote = 0 then
        delete from public.glossary_vote_receipts as receipt
         where receipt.term_id = p_term_id
           and receipt.voter_hash = v_voter_hash;
    else
        insert into public.glossary_vote_receipts (term_id, voter_hash, direction)
        values (
            p_term_id,
            v_voter_hash,
            case when p_vote = 1 then 'up' else 'down' end
        )
        on conflict (term_id, voter_hash)
        do update
              set direction = excluded.direction,
                  updated_at = pg_catalog.now();
    end if;

    update public.glossary_vote_totals as totals
       set upvotes = totals.upvotes
               - case when v_previous_vote = 1 then 1 else 0 end
               + case when p_vote = 1 then 1 else 0 end,
           downvotes = totals.downvotes
               - case when v_previous_vote = -1 then 1 else 0 end
               + case when p_vote = -1 then 1 else 0 end,
           updated_at = pg_catalog.now()
     where totals.term_id = p_term_id
     returning totals.upvotes, totals.downvotes
          into v_upvotes, v_downvotes;

    return query select true, p_vote, v_upvotes, v_downvotes;
end;
$function$;

-- "Trending" is intentionally narrow: the five terms with a positive net
-- balance among active votes created or changed in the trailing seven days.
-- No voter hashes or individual timestamps leave the private schema.
create or replace function private.get_glossary_trending_terms()
returns table (
    term_id uuid,
    recent_upvotes bigint,
    recent_downvotes bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
    select receipt.term_id,
           count(*) filter (where receipt.direction = 'up') as recent_upvotes,
           count(*) filter (where receipt.direction = 'down') as recent_downvotes
      from public.glossary_vote_receipts as receipt
     where receipt.updated_at >= pg_catalog.now() - interval '7 days'
     group by receipt.term_id
    having count(*) filter (where receipt.direction = 'up')
           > count(*) filter (where receipt.direction = 'down')
     order by (
                  count(*) filter (where receipt.direction = 'up')
                  - count(*) filter (where receipt.direction = 'down')
              ) desc,
              count(*) filter (where receipt.direction = 'up') desc,
              max(receipt.updated_at) desc,
              receipt.term_id
     limit 5;
$function$;

create or replace function public.get_glossary_trending_terms()
returns table (
    term_id uuid,
    recent_upvotes bigint,
    recent_downvotes bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
    select * from private.get_glossary_trending_terms();
$function$;

revoke all on function private.get_glossary_trending_terms()
    from public, anon, authenticated, service_role;
revoke all on function public.get_glossary_trending_terms()
    from public, anon, authenticated, service_role;

grant usage on schema private to anon;
grant execute on function private.get_glossary_trending_terms() to anon;
grant execute on function public.get_glossary_trending_terms() to anon;

comment on column public.glossary_vote_receipts.updated_at is
    'Last time this active browser vote changed direction.';
comment on function public.get_glossary_trending_terms() is
    'Returns up to five positively rated glossary terms from active vote changes in the trailing seven days.';

notify pgrst, 'reload schema';

commit;
