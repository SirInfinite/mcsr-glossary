begin;

-- Reversible voting is additive so the released v0.1 frontend can continue
-- using cast_glossary_vote() while the v0.2 frontend adopts this API.
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

    -- One row lock serializes every transition for a term. This keeps the
    -- receipt mutation and both aggregate deltas in the same short transaction.
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
        do update set direction = excluded.direction;
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

create or replace function private.get_glossary_vote_state(p_browser_id uuid)
returns table (
    term_id uuid,
    upvotes bigint,
    downvotes bigint,
    current_vote smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_voter_hash bytea;
begin
    if p_browser_id is null
        or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;

    v_voter_hash := extensions.digest(p_browser_id::text, 'sha256');

    return query
    select totals.term_id,
           totals.upvotes,
           totals.downvotes,
           case receipt.direction
               when 'up' then 1::smallint
               when 'down' then -1::smallint
               else 0::smallint
           end as current_vote
      from public.glossary_vote_totals as totals
      left join public.glossary_vote_receipts as receipt
        on receipt.term_id = totals.term_id
       and receipt.voter_hash = v_voter_hash
     order by totals.term_id;
end;
$function$;

create or replace function public.set_glossary_vote(
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
language sql
security invoker
set search_path = ''
as $function$
    select * from private.set_glossary_vote(p_term_id, p_browser_id, p_vote);
$function$;

create or replace function public.get_glossary_vote_state(p_browser_id uuid)
returns table (
    term_id uuid,
    upvotes bigint,
    downvotes bigint,
    current_vote smallint
)
language sql
stable
security invoker
set search_path = ''
as $function$
    select * from private.get_glossary_vote_state(p_browser_id);
$function$;

revoke all on function private.set_glossary_vote(uuid, uuid, smallint)
    from public, anon, authenticated, service_role;
revoke all on function private.get_glossary_vote_state(uuid)
    from public, anon, authenticated, service_role;
revoke all on function public.set_glossary_vote(uuid, uuid, smallint)
    from public, anon, authenticated, service_role;
revoke all on function public.get_glossary_vote_state(uuid)
    from public, anon, authenticated, service_role;

grant usage on schema private to anon;
grant execute on function private.set_glossary_vote(uuid, uuid, smallint) to anon;
grant execute on function private.get_glossary_vote_state(uuid) to anon;
grant execute on function public.set_glossary_vote(uuid, uuid, smallint) to anon;
grant execute on function public.get_glossary_vote_state(uuid) to anon;

comment on function public.set_glossary_vote(uuid, uuid, smallint) is
    'Atomically sets one browser vote to up (1), neutral (0), or down (-1) and returns authoritative totals.';
comment on function public.get_glossary_vote_state(uuid) is
    'Returns aggregate totals plus the requesting browser ID current vote without exposing vote receipts.';

notify pgrst, 'reload schema';

commit;
