begin;

-- Preserve imported prototype counts explicitly. Never erase historical votes
-- to make a receipt-only recount appear consistent. Negative differences fail.
alter table public.glossary_vote_totals
    add column legacy_upvotes bigint not null default 0 check (legacy_upvotes >= 0),
    add column legacy_downvotes bigint not null default 0 check (legacy_downvotes >= 0),
    add column term_name text,
    add column term_category text;

update public.glossary_vote_totals as totals
   set legacy_upvotes = totals.upvotes - (select count(*) from public.glossary_vote_receipts r where r.term_id = totals.term_id and r.direction = 'up'),
       legacy_downvotes = totals.downvotes - (select count(*) from public.glossary_vote_receipts r where r.term_id = totals.term_id and r.direction = 'down');

comment on column public.glossary_vote_totals.legacy_upvotes is 'Preserved pre-receipt vote baseline; maintained only through reviewed migrations.';
comment on column public.glossary_vote_totals.legacy_downvotes is 'Preserved pre-receipt vote baseline; maintained only through reviewed migrations.';

-- Canonical identity/category only, used to bind moderation to a published UUID.
-- Definitions, aliases, tags, status and editorial publishing stay in terms.json.
-- CANONICAL_TARGETS_BEGIN
update public.glossary_vote_totals as target
set term_name = source.name, term_category = source.category
from (values
    ('c124f0f4-d557-4ae2-88bd-9d2108fa1f6e'::uuid, 'All Advancements', 'format'),
    ('b612b6ee-074a-47ad-9fdf-0e4a774c582e'::uuid, 'Any%', 'format'),
    ('2d7db06d-00d2-48de-8d84-5a0152e069a5'::uuid, 'Atum', 'tool'),
    ('67b0b2dd-c7e5-4019-94ab-bd2bc937fa98'::uuid, 'Axis Calculated', 'technique'),
    ('eeafd00b-603f-4f15-b302-4b72c3d09824'::uuid, 'Bastion', 'terminology'),
    ('57736e7f-a35f-46f3-b254-8576dfc806f7'::uuid, 'Bastion Route', 'strategy'),
    ('49519490-1b5c-43e3-998a-9b689237b894'::uuid, 'Blaze', 'terminology'),
    ('63fade31-e8db-4914-9242-de837a339e0f'::uuid, 'Blaze Bed', 'technique'),
    ('c11fabb0-39ec-4d6b-8dca-73e5a4cf4125'::uuid, 'Blaze Rods', 'terminology'),
    ('456ac76d-1737-44d2-b5c3-1f980a9162be'::uuid, 'Blaze TNT', 'technique'),
    ('fdb43564-02d9-47aa-bf20-f000dc4bf7b6'::uuid, 'Blind Travel', 'strategy'),
    ('7a548600-0ed9-4c3b-b00e-c8491b09f1ba'::uuid, 'Boat Eye', 'technique'),
    ('0f3feedf-6e7c-483d-beef-2fbc9796217e'::uuid, 'Bridge Bastion', 'terminology'),
    ('aa2d2cbf-db2a-4368-aade-4edc2fecb00c'::uuid, 'Buried Treasure', 'terminology'),
    ('7e27ff9c-3e87-4b58-a8ba-5962cae2d866'::uuid, 'Calculated Travel', 'technique'),
    ('8f1d38a8-a954-4d90-9fe8-91a4e059e07b'::uuid, 'Classic', 'strategy'),
    ('036c95b3-bab4-42f9-b76c-6a0367c97f12'::uuid, 'Completable Ruined Portal', 'terminology'),
    ('4ddc9630-b0fc-4a39-8ada-8f9000a47bb0'::uuid, 'Desert Temple', 'terminology'),
    ('68cf54a3-14b6-42b9-bbca-1f8cba22b664'::uuid, 'Divine Travel', 'technique'),
    ('a462fac8-609a-4f4a-9bd2-467074a6bef0'::uuid, 'Donkey Kong Route', 'strategy'),
    ('3a0720cc-12eb-43f4-b5ea-abce6463cd7b'::uuid, 'Double Travel', 'strategy'),
    ('055bcac8-7ddb-4d56-a770-79e7b4450ad4'::uuid, 'Educated Travel', 'technique'),
    ('abd0eb7e-93f7-41a5-bc32-2c3194dff826'::uuid, 'Elo', 'terminology'),
    ('6086abcc-4c66-4214-b379-c978b500762d'::uuid, 'End Entry', 'terminology'),
    ('3fbb8875-5ccb-4671-a78e-8f1443c0fdd1'::uuid, 'Ender Pearl', 'terminology'),
    ('89b951db-b5d3-428d-bc7e-130040701284'::uuid, 'Eye of Ender', 'terminology'),
    ('188b89c9-f4b5-451c-b9a8-d75ddc7b561d'::uuid, 'F3', 'tool'),
    ('51d4c5fe-e0a6-4938-abcb-86098f788e7d'::uuid, 'Filtered Seed', 'format'),
    ('502a54e8-6e8d-4df2-9d28-f7c422878f56'::uuid, 'Flintless Portal', 'technique'),
    ('c5808280-b628-47ec-b6f9-8af82d64bb28'::uuid, 'Forced Perch', 'terminology'),
    ('9e1a7a9a-42b0-4bce-acdc-ef91eecdd781'::uuid, 'Fortress Navigation', 'technique'),
    ('eaeebc88-f7dd-411a-8591-2a740705fc70'::uuid, 'FSG', 'format'),
    ('b36468a1-8813-4561-a471-a58e0d4f7a28'::uuid, 'Glitchless', 'format'),
    ('6df3880e-c029-4f5d-8d38-fd4f7907acc7'::uuid, 'Half Bow', 'technique'),
    ('2e0b404a-9e30-451e-a1ee-3f547c10cfe3'::uuid, 'Housing Bastion', 'terminology'),
    ('4b6cddc9-3bf4-4a00-92fa-e27809d75064'::uuid, 'Hypermodern', 'strategy'),
    ('ef4e6706-da0b-4a7a-be55-4e3c90a32030'::uuid, 'IGT', 'terminology'),
    ('17fa7c3d-f0f0-4a07-921a-6e862137a69c'::uuid, 'Lava Pool', 'terminology'),
    ('424a871a-3858-4de2-8234-039e15cf2f7b'::uuid, 'Lava Pool Portal', 'technique'),
    ('8fa91be1-f6ca-404f-b1c1-90ac58cecea4'::uuid, 'Leaderboard', 'terminology'),
    ('61655f57-5e2e-4884-a460-d26991fd853b'::uuid, 'LiveSplit', 'tool'),
    ('f361c66a-07ab-4fdd-84bb-8d6548964d48'::uuid, 'Magma Ravine', 'terminology'),
    ('f94ab4fd-e78c-4954-8492-7a9df83d47e3'::uuid, 'Mapless', 'technique'),
    ('ea1eef03-66b4-4377-a2ab-d783a2bbe7aa'::uuid, 'Matchmaking', 'terminology'),
    ('a1b2c3d4-0001-0001-0001-000000000021'::uuid, 'MCSR Ranked', 'format'),
    ('3343e84e-b75f-4ad9-babe-6dba84590a89'::uuid, 'Microlensing', 'technique'),
    ('34237e84-7cf4-4193-bfdd-1445aebb56d0'::uuid, 'Minecraft Speedrunning', 'terminology'),
    ('646582e0-7d14-4079-8b5f-5da239af06f3'::uuid, 'Multi-Instance', 'strategy'),
    ('b7e4e72c-eadc-4d89-9f3a-bc2fa4e1c123'::uuid, 'Nether Entry', 'terminology'),
    ('dc8e734a-7d9e-43bd-9b9d-9c6b00ee2f49'::uuid, 'Nether Exit', 'terminology'),
    ('17e08ae7-ab41-4e6a-87b2-e4a7940dd600'::uuid, 'Nether Fortress', 'terminology'),
    ('38f75326-fd11-436d-8bce-e3b4e7df6c8c'::uuid, 'Nether Travel', 'strategy'),
    ('c66d062a-5395-4703-a4cd-2e3d79fc17d9'::uuid, 'Ninjabrain Bot', 'tool'),
    ('0c9c0fc3-24ec-493e-90fb-af0754ad270e'::uuid, 'No F3', 'format'),
    ('2e0b6568-e383-40f8-b114-adee40e4c851'::uuid, 'No Reset', 'strategy'),
    ('9af0fd71-077d-4224-811e-01897e47ae90'::uuid, 'Obsidian', 'terminology'),
    ('7c47b455-5752-4f46-bc57-cafae58d5e94'::uuid, 'One Cycle', 'technique'),
    ('afbf957a-15ca-425f-9deb-33a3f3407a98'::uuid, 'Pace', 'terminology'),
    ('32607ae2-6c99-42d0-a148-4d1fbb5d6cc5'::uuid, 'PaceMan', 'tool'),
    ('fb3f3ad9-da01-4c1d-8f21-6d37670bec49'::uuid, 'PB', 'terminology'),
    ('1360305f-d32c-433d-b462-ae256d237909'::uuid, 'Pearl Hanging', 'technique'),
    ('4606716b-2e5a-445c-ab6b-cbff0e8ae9c3'::uuid, 'Perch', 'terminology'),
    ('9225b150-5768-429c-87f2-8701dfcc16d1'::uuid, 'Perfect Travel', 'technique'),
    ('d9fb1556-467c-4803-a4bd-5125e07ed45d'::uuid, 'Pie Chart', 'tool'),
    ('f53d1840-0824-48bb-aa31-774dbc899aad'::uuid, 'Pie-Ray', 'technique'),
    ('725c3c13-eaef-4bf6-bc43-4a73a852c9c8'::uuid, 'Piglin Bartering', 'technique'),
    ('67321e61-3208-463e-bb30-ade177577889'::uuid, 'Placement Match', 'terminology'),
    ('814982d5-30b4-4ee4-9b26-3b2fd2d85463'::uuid, 'Portal Room', 'terminology'),
    ('89dd6847-884a-4f5d-a44c-4d6931ef4f7b'::uuid, 'Preemptive Navigation', 'technique'),
    ('ad9d3e01-d7ba-4dbc-a99e-16d7cb078b26'::uuid, 'Random Seed', 'format'),
    ('ab51c808-715b-4256-8944-4b88c9595955'::uuid, 'Reset', 'terminology'),
    ('41fd1274-d8e5-4ded-a28d-97cdb4333295'::uuid, 'Reset Efficiency', 'strategy'),
    ('6924ba84-ad16-40dc-ab58-6bd51383b0df'::uuid, 'RNG', 'terminology'),
    ('cc67e5c4-ff1e-4495-b962-bab68db9fb5c'::uuid, 'RNG Standardization', 'terminology'),
    ('1a1a4edc-d019-4310-855a-67dc0f56795f'::uuid, 'RSG', 'format'),
    ('6bcfb691-110b-4b14-ad1f-a25175592b5b'::uuid, 'RTA', 'terminology'),
    ('2cebc9c2-3f77-4226-b8e6-946078738f8f'::uuid, 'Ruined Portal', 'terminology'),
    ('7d8e55db-47db-4d03-ae6d-c7912ede831b'::uuid, 'Seed', 'terminology'),
    ('af4d6775-4bc9-4662-9048-7a72e76e9015'::uuid, 'Seedbank', 'format'),
    ('c68cfbe2-e105-420e-bc54-5bfcd6e755be'::uuid, 'SeedQueue', 'tool'),
    ('8cde1926-1e03-431f-b3c5-7baa149add0b'::uuid, 'Set Seed', 'format'),
    ('023a8072-ba50-4ede-81be-7da643e32093'::uuid, 'Shipwreck', 'terminology'),
    ('6bed6409-abd8-4af7-a6a7-b88a3012a1ed'::uuid, 'Spawn', 'terminology'),
    ('aa302b20-470f-4aeb-8ed2-4516aeef0437'::uuid, 'Speedrun.com', 'tool'),
    ('f7f7756d-dbab-4d2b-90cb-44400e77801e'::uuid, 'SpeedRunIGT', 'tool'),
    ('5bf9c441-704b-4126-b3a5-206d62364550'::uuid, 'Split', 'terminology'),
    ('486b9602-483f-44de-8f1b-2b4f27f66446'::uuid, 'SSG', 'format'),
    ('df178e7f-17b3-4bc0-8e1a-749a8e73be7b'::uuid, 'Stables Bastion', 'terminology'),
    ('3482ce6e-a7fb-494c-ad80-f3642bcd5078'::uuid, 'StandardSettings', 'tool'),
    ('14343701-4695-4443-919a-29f291ea0888'::uuid, 'Starter Staircase', 'terminology'),
    ('6b9d6f01-f91f-463f-a41d-efc60b47fbd1'::uuid, 'Stronghold', 'terminology'),
    ('eb64f87c-1ca1-49f8-876f-cfe14d037d3c'::uuid, 'Stronghold Navigation', 'technique'),
    ('ae770e14-ca3e-40a7-9f0a-747288db6017'::uuid, 'Treasure Bastion', 'terminology'),
    ('08bf985b-3daf-4923-a5d0-52b8d268beda'::uuid, 'Triangulation', 'technique'),
    ('547d3255-5069-47c0-9c30-757598876aee'::uuid, 'Village', 'terminology'),
    ('6d11497f-32dd-426a-898c-e0e29f7ac731'::uuid, 'Wall', 'tool'),
    ('9b4f7ee8-d752-40ef-9d71-ff5c6c1c0013'::uuid, 'WorldPreview', 'tool'),
    ('a1b2c3d4-0001-0001-0001-000000000020'::uuid, 'WR', 'terminology'),
    ('d6bf8493-878b-4616-b906-f46705905345'::uuid, 'Zero Cycle', 'technique'),
    ('1da0d2b2-96fe-4b96-84ee-2420b60119b1'::uuid, 'ZSG', 'format')
) as source(id, name, category) where target.term_id = source.id;
-- CANONICAL_TARGETS_END

alter table public.glossary_vote_totals
    alter column term_name set not null,
    alter column term_category set not null,
    add constraint glossary_vote_target_name check (term_name = btrim(term_name) and char_length(term_name) between 2 and 100),
    add constraint glossary_vote_target_category check (term_category in ('format', 'strategy', 'technique', 'terminology', 'tool'));
create unique index glossary_vote_target_name_unique on public.glossary_vote_totals (lower(term_name));

-- A deferred constraint checks the final transaction state after both receipt
-- and total changes. It protects maintenance writes as well as RPC callers.
create function private.check_glossary_vote_integrity()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
    v_id uuid;
    v_totals public.glossary_vote_totals%rowtype;
    v_up bigint;
    v_down bigint;
begin
    for v_id in select distinct id from unnest(array[
        case when tg_op <> 'INSERT' then old.term_id end,
        case when tg_op <> 'DELETE' then new.term_id end
    ]) as affected(id) where id is not null loop
        select * into v_totals from public.glossary_vote_totals where term_id = v_id for update;
        if found then
            select count(*) filter (where direction = 'up'), count(*) filter (where direction = 'down')
              into v_up, v_down from public.glossary_vote_receipts where term_id = v_id;
            if v_totals.upvotes <> v_totals.legacy_upvotes + v_up
                or v_totals.downvotes <> v_totals.legacy_downvotes + v_down then
                raise exception using errcode = '23514', message = 'Vote totals must match receipts plus the preserved legacy baseline.';
            end if;
        end if;
    end loop;
    return null;
end;
$function$;
revoke all on function private.check_glossary_vote_integrity() from public, anon, authenticated, service_role;
create constraint trigger glossary_totals_consistent after insert or update or delete on public.glossary_vote_totals
    deferrable initially deferred for each row execute function private.check_glossary_vote_integrity();
create constraint trigger glossary_receipts_consistent after insert or update or delete on public.glossary_vote_receipts
    deferrable initially deferred for each row execute function private.check_glossary_vote_integrity();

create function private.valid_glossary_list(items text[], max_items integer, max_length integer, tags boolean)
returns boolean language sql immutable security invoker set search_path = ''
as $function$
    select items is not null
       and coalesce(array_ndims(items), 1) = 1
       and cardinality(items) <= max_items
       and not exists (select 1 from unnest(items) as item(value)
           where value is null or value <> btrim(value) or char_length(value) not between 1 and max_length
              or (tags and value !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'))
       and cardinality(items) = (select count(distinct lower(value)) from unnest(items) as item(value));
$function$;
revoke all on function private.valid_glossary_list(text[], integer, integer, boolean) from public, anon, authenticated, service_role;
-- Trusted moderation writers need the CHECK helper, but no privileged RPCs.
grant usage on schema private to service_role;
grant execute on function private.valid_glossary_list(text[], integer, integer, boolean) to service_role;

alter table public.glossary_submissions
    add column kind text not null default 'new',
    add column term_id uuid references public.glossary_vote_totals(term_id) on delete restrict;

update public.glossary_submissions as submission
   set kind = 'correction', term_id = target.term_id
  from public.glossary_vote_totals as target
 where 'correction' = any(submission.tags) and lower(submission.name) = lower(target.term_name);

-- An ambiguous historical correction requires review, never silent relabeling.
do $review$
begin
    if exists (select 1 from public.glossary_submissions where 'correction' = any(tags) and term_id is null) then
        raise exception 'Unresolved historical correction proposals require maintainer review before this migration.';
    end if;
end;
$review$;

alter table public.glossary_submissions
    add constraint glossary_submission_kind check ((kind = 'new' and term_id is null) or (kind = 'correction' and term_id is not null)),
    add constraint glossary_submission_alias_items check (private.valid_glossary_list(aliases, 10, 80, false)),
    add constraint glossary_submission_tag_items check (private.valid_glossary_list(tags, 12, 40, true));
create index glossary_submission_target on public.glossary_submissions (term_id) where term_id is not null;
create index glossary_submissions_submitter_activity on public.glossary_submissions (submitter_hash, created_at desc);
drop index public.glossary_submissions_pending_by_submitter;

-- Retain the released RPC signature. Move its already-reviewed normalization,
-- cooldown and serialized moderation insertion behind a non-callable helper.
alter function private.submit_glossary_term(uuid, text, text, text[], text[], text, text) rename to insert_glossary_proposal;
revoke all on function private.insert_glossary_proposal(uuid, text, text, text[], text[], text, text) from public, anon, authenticated, service_role;

create function private.submit_glossary_term(p_browser_id uuid, p_name text, p_category text, p_aliases text[], p_tags text[], p_definition text, p_website text)
returns table (submission_id uuid, submission_status text)
language plpgsql security definer set search_path = ''
as $function$
declare
    v_id uuid;
    v_target uuid;
    v_is_correction boolean := 'correction' = any(coalesce(p_tags, '{}'::text[]));
begin
    if coalesce(array_ndims(p_aliases), 1) <> 1 or coalesce(array_ndims(p_tags), 1) <> 1 then
        raise exception using errcode = '22023', message = 'Aliases and tags must be one-dimensional lists.';
    end if;
    if exists (select 1 from unnest(p_aliases) a where lower(btrim(a)) = lower(btrim(p_name))) then
        raise exception using errcode = '22023', message = 'An alias cannot repeat the canonical name.';
    end if;
    if v_is_correction then
        select term_id into v_target from public.glossary_vote_totals where lower(term_name) = lower(btrim(p_name)) and term_category = btrim(p_category);
        if not found then raise exception using errcode = '22023', message = 'Choose a published term to correct.'; end if;
    end if;
    select proposal.submission_id into v_id from private.insert_glossary_proposal(p_browser_id, p_name, p_category, p_aliases, p_tags, p_definition, p_website) proposal;
    if v_is_correction then update public.glossary_submissions set kind = 'correction', term_id = v_target where id = v_id; end if;
    return query select v_id, 'pending'::text;
end;
$function$;
revoke all on function private.submit_glossary_term(uuid, text, text, text[], text[], text, text) from public, anon, authenticated, service_role;
grant execute on function private.submit_glossary_term(uuid, text, text, text[], text[], text, text) to anon;

create function private.submit_glossary_correction(p_browser_id uuid, p_term_id uuid, p_definition text, p_website text)
returns table (submission_id uuid, submission_status text)
language plpgsql security definer set search_path = ''
as $function$
declare v_target public.glossary_vote_totals%rowtype;
begin
    select * into v_target from public.glossary_vote_totals where term_id = p_term_id;
    if not found then raise exception using errcode = '22023', message = 'Unknown glossary term.'; end if;
    return query select * from private.submit_glossary_term(p_browser_id, v_target.term_name, v_target.term_category, '{}'::text[], array['correction'], p_definition, p_website);
end;
$function$;
create function public.submit_glossary_correction(p_browser_id uuid, p_term_id uuid, p_definition text, p_website text)
returns table (submission_id uuid, submission_status text)
language sql security invoker set search_path = ''
as $function$ select * from private.submit_glossary_correction(p_browser_id, p_term_id, p_definition, p_website); $function$;
revoke all on function private.submit_glossary_correction(uuid, uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.submit_glossary_correction(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function private.submit_glossary_correction(uuid, uuid, text, text) to anon;
grant execute on function public.submit_glossary_correction(uuid, uuid, text, text) to anon;

-- Reject spoofed display names at the backend boundary too.
alter function private.submit_glossary_term_report(uuid, uuid, text, text, text, text) rename to insert_glossary_report;
revoke all on function private.insert_glossary_report(uuid, uuid, text, text, text, text) from public, anon, authenticated, service_role;
create function private.submit_glossary_term_report(p_browser_id uuid, p_term_id uuid, p_term_name text, p_reason text, p_details text, p_website text)
returns table (report_id uuid, report_status text, created boolean)
language plpgsql security definer set search_path = ''
as $function$
begin
    if not exists (select 1 from public.glossary_vote_totals where term_id = p_term_id and term_name = btrim(p_term_name)) then
        raise exception using errcode = '22023', message = 'Choose a published glossary term.';
    end if;
    return query select * from private.insert_glossary_report(p_browser_id, p_term_id, p_term_name, p_reason, p_details, p_website);
end;
$function$;
revoke all on function private.submit_glossary_term_report(uuid, uuid, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function private.submit_glossary_term_report(uuid, uuid, text, text, text, text) to anon;

-- Refresh the public wrappers explicitly after renaming their private helpers,
-- including on servers that cached these functions before the upgrade.
create or replace function public.submit_glossary_term(p_browser_id uuid, p_name text, p_category text, p_aliases text[], p_tags text[], p_definition text, p_website text)
returns table (submission_id uuid, submission_status text)
language sql security invoker set search_path = ''
as $function$ select * from private.submit_glossary_term(p_browser_id, p_name, p_category, p_aliases, p_tags, p_definition, p_website); $function$;
create or replace function public.submit_glossary_term_report(p_browser_id uuid, p_term_id uuid, p_term_name text, p_reason text, p_details text, p_website text)
returns table (report_id uuid, report_status text, created boolean)
language sql security invoker set search_path = ''
as $function$ select * from private.submit_glossary_term_report(p_browser_id, p_term_id, p_term_name, p_reason, p_details, p_website); $function$;
revoke all on function public.submit_glossary_term(uuid, text, text, text[], text[], text, text) from public, anon, authenticated, service_role;
revoke all on function public.submit_glossary_term_report(uuid, uuid, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_glossary_term(uuid, text, text, text[], text[], text, text) to anon;
grant execute on function public.submit_glossary_term_report(uuid, uuid, text, text, text, text) to anon;

comment on table public.glossary_vote_totals is 'Canonical voting/moderation targets and aggregates; totals equal immutable legacy baselines plus current private receipts. No direct public access.';
comment on column public.glossary_submissions.kind is 'Explicit new proposal or correction to term_id; both remain private and pending until manual review.';
notify pgrst, 'reload schema';
commit;
