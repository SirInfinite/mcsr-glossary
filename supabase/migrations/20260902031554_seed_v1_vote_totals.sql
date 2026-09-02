begin;

-- Voting rejects unknown term IDs, so every published v1 term must have an
-- aggregate row. This migration is additive and safe to re-run.
insert into public.glossary_vote_totals (term_id) values
    ('b612b6ee-074a-47ad-9fdf-0e4a774c582e'::uuid), -- Any%
    ('eeafd00b-603f-4f15-b302-4b72c3d09824'::uuid), -- Bastion
    ('57736e7f-a35f-46f3-b254-8576dfc806f7'::uuid), -- Bastion Route
    ('fdb43564-02d9-47aa-bf20-f000dc4bf7b6'::uuid), -- Blind
    ('49519490-1b5c-43e3-998a-9b689237b894'::uuid), -- Blaze
    ('c11fabb0-39ec-4d6b-8dca-73e5a4cf4125'::uuid), -- Blaze Rods
    ('0f3feedf-6e7c-483d-beef-2fbc9796217e'::uuid), -- Bridge Bastion
    ('7e27ff9c-3e87-4b58-a8ba-5962cae2d866'::uuid), -- Calculated Travel
    ('8f1d38a8-a954-4d90-9fe8-91a4e059e07b'::uuid), -- Classic
    ('68cf54a3-14b6-42b9-bbca-1f8cba22b664'::uuid), -- Divine Travel
    ('055bcac8-7ddb-4d56-a770-79e7b4450ad4'::uuid), -- Educated Travel
    ('abd0eb7e-93f7-41a5-bc32-2c3194dff826'::uuid), -- Elo
    ('3fbb8875-5ccb-4671-a78e-8f1443c0fdd1'::uuid), -- Ender Pearl
    ('89b951db-b5d3-428d-bc7e-130040701284'::uuid), -- Eye of Ender
    ('188b89c9-f4b5-451c-b9a8-d75ddc7b561d'::uuid), -- F3
    ('51d4c5fe-e0a6-4938-abcb-86098f788e7d'::uuid), -- Filtered Seed
    ('2e0b404a-9e30-451e-a1ee-3f547c10cfe3'::uuid), -- Housing Bastion
    ('4b6cddc9-3bf4-4a00-92fa-e27809d75064'::uuid), -- Hypermodern
    ('ef4e6706-da0b-4a7a-be55-4e3c90a32030'::uuid), -- IGT
    ('8fa91be1-f6ca-404f-b1c1-90ac58cecea4'::uuid), -- Leaderboard
    ('61655f57-5e2e-4884-a460-d26991fd853b'::uuid), -- LiveSplit
    ('f94ab4fd-e78c-4954-8492-7a9df83d47e3'::uuid), -- Mapless
    ('34237e84-7cf4-4193-bfdd-1445aebb56d0'::uuid), -- Minecraft Speedrunning
    ('a1b2c3d4-0001-0001-0001-000000000021'::uuid), -- MCSR Ranked (stable existing ID)
    ('646582e0-7d14-4079-8b5f-5da239af06f3'::uuid), -- Multi-Instance
    ('38f75326-fd11-436d-8bce-e3b4e7df6c8c'::uuid), -- Nether Travel
    ('17e08ae7-ab41-4e6a-87b2-e4a7940dd600'::uuid), -- Nether Fortress
    ('c66d062a-5395-4703-a4cd-2e3d79fc17d9'::uuid), -- Ninjabrain Bot
    ('9af0fd71-077d-4224-811e-01897e47ae90'::uuid), -- Obsidian
    ('7c47b455-5752-4f46-bc57-cafae58d5e94'::uuid), -- One Cycle
    ('afbf957a-15ca-425f-9deb-33a3f3407a98'::uuid), -- Pace
    ('fb3f3ad9-da01-4c1d-8f21-6d37670bec49'::uuid), -- PB
    ('4606716b-2e5a-445c-ab6b-cbff0e8ae9c3'::uuid), -- Perch
    ('d9fb1556-467c-4803-a4bd-5125e07ed45d'::uuid), -- Pie Chart
    ('725c3c13-eaef-4bf6-bc43-4a73a852c9c8'::uuid), -- Piglin Bartering
    ('ad9d3e01-d7ba-4dbc-a99e-16d7cb078b26'::uuid), -- Random Seed
    ('ab51c808-715b-4256-8944-4b88c9595955'::uuid), -- Reset
    ('cc67e5c4-ff1e-4495-b962-bab68db9fb5c'::uuid), -- RNG Standardization
    ('6bcfb691-110b-4b14-ad1f-a25175592b5b'::uuid), -- RTA
    ('1a1a4edc-d019-4310-855a-67dc0f56795f'::uuid), -- RSG
    ('7d8e55db-47db-4d03-ae6d-c7912ede831b'::uuid), -- Seed
    ('c68cfbe2-e105-420e-bc54-5bfcd6e755be'::uuid), -- SeedQueue
    ('8cde1926-1e03-431f-b3c5-7baa149add0b'::uuid), -- Set Seed
    ('5bf9c441-704b-4126-b3a5-206d62364550'::uuid), -- Split
    ('6bed6409-abd8-4af7-a6a7-b88a3012a1ed'::uuid), -- Spawn
    ('aa302b20-470f-4aeb-8ed2-4516aeef0437'::uuid), -- Speedrun.com
    ('df178e7f-17b3-4bc0-8e1a-749a8e73be7b'::uuid), -- Stables Bastion
    ('6b9d6f01-f91f-463f-a41d-efc60b47fbd1'::uuid), -- Stronghold
    ('ae770e14-ca3e-40a7-9f0a-747288db6017'::uuid), -- Treasure Bastion
    ('08bf985b-3daf-4923-a5d0-52b8d268beda'::uuid), -- Triangulation
    ('a1b2c3d4-0001-0001-0001-000000000020'::uuid), -- WR (stable existing ID)
    ('d6bf8493-878b-4616-b906-f46705905345'::uuid)  -- Zero Cycle
on conflict (term_id) do nothing;

-- Preserve totals from the deprecated prototype when a legacy term ID matches
-- a canonical UUID. GREATEST makes this idempotent and never lowers a count.
do $legacy$
begin
    if to_regclass('public.votes') is not null then
        execute $copy$
            update public.glossary_vote_totals as totals
               set upvotes = greatest(totals.upvotes, greatest(coalesce(legacy.upvotes::bigint, 0), 0)),
                   downvotes = greatest(totals.downvotes, greatest(coalesce(legacy.downvotes::bigint, 0), 0)),
                   updated_at = pg_catalog.now()
              from public.votes as legacy
             where totals.term_id::text = legacy.term_id
        $copy$;
    end if;
end;
$legacy$;

notify pgrst, 'reload schema';

commit;

