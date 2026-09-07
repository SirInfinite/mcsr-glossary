begin;

-- Published glossary content lives in data/terms.json. Seed only the aggregate
-- vote targets for independently researched additions; existing totals remain
-- unchanged when this migration is replayed.
insert into public.glossary_vote_totals (term_id)
values
    ('c124f0f4-d557-4ae2-88bd-9d2108fa1f6e'::uuid), -- All Advancements
    ('67b0b2dd-c7e5-4019-94ab-bd2bc937fa98'::uuid), -- Axis Calculated
    ('456ac76d-1737-44d2-b5c3-1f980a9162be'::uuid), -- Blaze TNT
    ('7a548600-0ed9-4c3b-b00e-c8491b09f1ba'::uuid), -- Boat Eye
    ('036c95b3-bab4-42f9-b76c-6a0367c97f12'::uuid), -- Completable Ruined Portal
    ('a462fac8-609a-4f4a-9bd2-467074a6bef0'::uuid), -- Donkey Kong Route
    ('3a0720cc-12eb-43f4-b5ea-abce6463cd7b'::uuid), -- Double Travel
    ('dc8e734a-7d9e-43bd-9b9d-9c6b00ee2f49'::uuid), -- Nether Exit
    ('0c9c0fc3-24ec-493e-90fb-af0754ad270e'::uuid), -- No F3
    ('2e0b6568-e383-40f8-b114-adee40e4c851'::uuid), -- No Reset
    ('32607ae2-6c99-42d0-a148-4d1fbb5d6cc5'::uuid), -- PaceMan
    ('1360305f-d32c-433d-b462-ae256d237909'::uuid), -- Pearl Hanging
    ('9225b150-5768-429c-87f2-8701dfcc16d1'::uuid), -- Perfect Travel
    ('f53d1840-0824-48bb-aa31-774dbc899aad'::uuid), -- Pie-Ray
    ('89dd6847-884a-4f5d-a44c-4d6931ef4f7b'::uuid), -- Preemptive Navigation
    ('41fd1274-d8e5-4ded-a28d-97cdb4333295'::uuid), -- Reset Efficiency
    ('af4d6775-4bc9-4662-9048-7a72e76e9015'::uuid), -- Seedbank
    ('486b9602-483f-44de-8f1b-2b4f27f66446'::uuid), -- SSG
    ('6d11497f-32dd-426a-898c-e0e29f7ac731'::uuid), -- Wall
    ('1da0d2b2-96fe-4b96-84ee-2420b60119b1'::uuid)  -- ZSG
on conflict (term_id) do nothing;

commit;
