begin;

-- Aggregate totals are the only table rows anonymous clients may read directly.
create table if not exists public.glossary_vote_totals (
    term_id uuid primary key,
    upvotes bigint not null default 0,
    downvotes bigint not null default 0,
    updated_at timestamptz not null default now(),
    constraint glossary_vote_totals_upvotes_nonnegative check (upvotes >= 0),
    constraint glossary_vote_totals_downvotes_nonnegative check (downvotes >= 0)
);

-- One receipt per browser-generated ID and term provides lightweight duplicate friction.
-- This is not identity: a user can clear storage or choose another UUID.
create table if not exists public.glossary_vote_receipts (
    term_id uuid not null references public.glossary_vote_totals(term_id) on delete cascade,
    browser_id uuid not null,
    direction text not null,
    created_at timestamptz not null default now(),
    primary key (term_id, browser_id),
    constraint glossary_vote_receipts_direction check (direction in ('up', 'down')),
    constraint glossary_vote_receipts_browser_id_nonzero check (browser_id <> '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Submissions are moderation records. They never write to the approved static glossary.
create table if not exists public.glossary_submissions (
    id uuid primary key default gen_random_uuid(),
    browser_id uuid not null,
    name text not null,
    category text not null,
    aliases text[] not null default '{}'::text[],
    tags text[] not null default '{}'::text[],
    definition text not null,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    moderation_notes text,
    constraint glossary_submissions_browser_id_nonzero check (browser_id <> '00000000-0000-0000-0000-000000000000'::uuid),
    constraint glossary_submissions_name_length check (name = btrim(name) and char_length(name) between 2 and 100),
    constraint glossary_submissions_category_length check (category = btrim(category) and char_length(category) between 2 and 80),
    constraint glossary_submissions_definition_length check (definition = btrim(definition) and char_length(definition) between 20 and 5000),
    constraint glossary_submissions_alias_count check (cardinality(aliases) <= 10),
    constraint glossary_submissions_alias_values check (array_position(aliases, null) is null and char_length(array_to_string(aliases, ',')) <= 1000),
    constraint glossary_submissions_tag_count check (cardinality(tags) <= 12),
    constraint glossary_submissions_tag_values check (array_position(tags, null) is null and char_length(array_to_string(tags, ',')) <= 600),
    constraint glossary_submissions_status check (status in ('pending', 'approved', 'rejected')),
    constraint glossary_submissions_review_state check (
        (status = 'pending' and reviewed_at is null)
        or (status in ('approved', 'rejected') and reviewed_at is not null)
    )
);

create index if not exists glossary_submissions_moderation_queue
    on public.glossary_submissions (status, created_at);

create unique index if not exists glossary_submissions_one_pending_name_per_browser
    on public.glossary_submissions (browser_id, lower(name))
    where status = 'pending';

alter table public.glossary_vote_totals enable row level security;
alter table public.glossary_vote_receipts enable row level security;
alter table public.glossary_submissions enable row level security;

revoke all on table public.glossary_vote_totals from public, anon, authenticated;
revoke all on table public.glossary_vote_receipts from public, anon, authenticated;
revoke all on table public.glossary_submissions from public, anon, authenticated;

grant usage on schema public to anon;
grant select on table public.glossary_vote_totals to anon;
grant all on table public.glossary_vote_totals to service_role;
grant all on table public.glossary_vote_receipts to service_role;
grant all on table public.glossary_submissions to service_role;

drop policy if exists "anonymous read glossary vote totals" on public.glossary_vote_totals;
create policy "anonymous read glossary vote totals"
    on public.glossary_vote_totals
    for select
    to anon
    using (true);

-- No public policies are created for receipts or submissions. Direct access is denied.

create or replace function public.cast_glossary_vote(
    p_term_id uuid,
    p_browser_id uuid,
    p_direction text
)
returns table (
    accepted boolean,
    upvotes bigint,
    downvotes bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_direction text := lower(btrim(coalesce(p_direction, '')));
    v_inserted_rows integer := 0;
    v_upvotes bigint;
    v_downvotes bigint;
begin
    if p_term_id is null then
        raise exception using errcode = '22023', message = 'Term ID is required.';
    end if;
    if p_browser_id is null or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;
    if v_direction not in ('up', 'down') then
        raise exception using errcode = '22023', message = 'Vote direction must be up or down.';
    end if;

    -- Lock one aggregate row so concurrent votes for a term cannot overwrite each other.
    select totals.upvotes, totals.downvotes
      into v_upvotes, v_downvotes
      from public.glossary_vote_totals as totals
     where totals.term_id = p_term_id
     for update;

    if not found then
        raise exception using errcode = '22023', message = 'Unknown glossary term.';
    end if;

    insert into public.glossary_vote_receipts (term_id, browser_id, direction)
    values (p_term_id, p_browser_id, v_direction)
    on conflict (term_id, browser_id) do nothing;

    get diagnostics v_inserted_rows = row_count;

    if v_inserted_rows = 1 then
        update public.glossary_vote_totals as totals
           set upvotes = totals.upvotes + case when v_direction = 'up' then 1 else 0 end,
               downvotes = totals.downvotes + case when v_direction = 'down' then 1 else 0 end,
               updated_at = now()
         where totals.term_id = p_term_id
         returning totals.upvotes, totals.downvotes into v_upvotes, v_downvotes;
    end if;

    return query select v_inserted_rows = 1, v_upvotes, v_downvotes;
end;
$function$;

create or replace function public.submit_glossary_term(
    p_browser_id uuid,
    p_name text,
    p_category text,
    p_aliases text[],
    p_tags text[],
    p_definition text,
    p_website text
)
returns table (
    submission_id uuid,
    submission_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_category text := btrim(coalesce(p_category, ''));
    v_aliases text[] := coalesce(p_aliases, '{}'::text[]);
    v_tags text[] := coalesce(p_tags, '{}'::text[]);
    v_definition text := btrim(coalesce(p_definition, ''));
    v_submission_id uuid;
begin
    if btrim(coalesce(p_website, '')) <> '' then
        raise exception using errcode = '22023', message = 'Submission rejected.';
    end if;
    if p_browser_id is null or p_browser_id = '00000000-0000-0000-0000-000000000000'::uuid then
        raise exception using errcode = '22023', message = 'A valid browser ID is required.';
    end if;
    if char_length(v_name) not between 2 and 100 then
        raise exception using errcode = '22023', message = 'Term name must be between 2 and 100 characters.';
    end if;
    if char_length(v_category) not between 2 and 80 then
        raise exception using errcode = '22023', message = 'Category must be between 2 and 80 characters.';
    end if;
    if char_length(v_definition) not between 20 and 5000 then
        raise exception using errcode = '22023', message = 'Definition must be between 20 and 5000 characters.';
    end if;
    if cardinality(v_aliases) > 10 then
        raise exception using errcode = '22023', message = 'At most 10 aliases are allowed.';
    end if;
    if exists (
        select 1
          from unnest(v_aliases) as alias_item(value)
         where alias_item.value is null
            or char_length(btrim(alias_item.value)) not between 1 and 80
    ) then
        raise exception using errcode = '22023', message = 'Aliases must contain 1 to 80 characters.';
    end if;
    if cardinality(v_tags) > 12 then
        raise exception using errcode = '22023', message = 'At most 12 tags are allowed.';
    end if;
    if exists (
        select 1
          from unnest(v_tags) as tag_item(value)
         where tag_item.value is null
            or char_length(btrim(tag_item.value)) not between 1 and 40
    ) then
        raise exception using errcode = '22023', message = 'Tags must contain 1 to 40 characters.';
    end if;

    select coalesce(array_agg(btrim(alias_item.value)), '{}'::text[])
      into v_aliases
      from unnest(v_aliases) as alias_item(value);

    select coalesce(array_agg(lower(btrim(tag_item.value))), '{}'::text[])
      into v_tags
      from unnest(v_tags) as tag_item(value);

    insert into public.glossary_submissions (
        browser_id,
        name,
        category,
        aliases,
        tags,
        definition
    ) values (
        p_browser_id,
        v_name,
        v_category,
        v_aliases,
        v_tags,
        v_definition
    )
    returning id into v_submission_id;

    return query select v_submission_id, 'pending'::text;
end;
$function$;

revoke all on function public.cast_glossary_vote(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_glossary_term(uuid, text, text, text[], text[], text, text) from public, anon, authenticated;
grant execute on function public.cast_glossary_vote(uuid, uuid, text) to anon;
grant execute on function public.submit_glossary_term(uuid, text, text, text[], text[], text, text) to anon;

-- Only UUIDs present here can receive votes. Add a row when a term is added to terms.json.
insert into public.glossary_vote_totals (term_id) values
    ('34237e84-7cf4-4193-bfdd-1445aebb56d0'::uuid),
    ('8616711e-0118-4c2b-b1bc-abd708ec5896'::uuid),
    ('b612b6ee-074a-47ad-9fdf-0e4a774c582e'::uuid),
    ('fdb43564-02d9-47aa-bf20-f000dc4bf7b6'::uuid),
    ('7c47b455-5752-4f46-bc57-cafae58d5e94'::uuid),
    ('d6bf8493-878b-4616-b906-f46705905345'::uuid),
    ('d9fb1556-467c-4803-a4bd-5125e07ed45d'::uuid),
    ('f94ab4fd-e78c-4954-8492-7a9df83d47e3'::uuid),
    ('4b6cddc9-3bf4-4a00-92fa-e27809d75064'::uuid),
    ('ab51c808-715b-4256-8944-4b88c9595955'::uuid),
    ('5bf9c441-704b-4126-b3a5-206d62364550'::uuid),
    ('fb3f3ad9-da01-4c1d-8f21-6d37670bec49'::uuid),
    ('a1b2c3d4-0001-0001-0001-000000000020'::uuid),
    ('a1b2c3d4-0001-0001-0001-000000000021'::uuid),
    ('8f1d38a8-a954-4d90-9fe8-91a4e059e07b'::uuid)
on conflict (term_id) do nothing;

comment on table public.glossary_vote_totals is 'Publicly readable aggregate glossary vote counts; writes only through cast_glossary_vote.';
comment on table public.glossary_vote_receipts is 'Private weak duplicate-vote receipts keyed by browser-generated UUID.';
comment on table public.glossary_submissions is 'Private moderation queue for proposed glossary terms.';

notify pgrst, 'reload schema';

commit;
