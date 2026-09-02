begin;

-- Published glossary terms remain in data/terms.json. These rows only give the
-- v0.2 additions stable aggregate vote targets before the frontend references
-- them. Existing totals are preserved.
insert into public.glossary_vote_totals (term_id)
values
    ('2d7db06d-00d2-48de-8d84-5a0152e069a5'::uuid), -- Atum
    ('63fade31-e8db-4914-9242-de837a339e0f'::uuid), -- Blaze Bed
    ('424a871a-3858-4de2-8234-039e15cf2f7b'::uuid), -- Bucket Portal
    ('aa2d2cbf-db2a-4368-aade-4edc2fecb00c'::uuid), -- Buried Treasure
    ('4ddc9630-b0fc-4a39-8ada-8f9000a47bb0'::uuid), -- Desert Temple
    ('6086abcc-4c66-4214-b379-c978b500762d'::uuid), -- End Entry
    ('502a54e8-6e8d-4df2-9d28-f7c422878f56'::uuid), -- Flintless Portal
    ('c5808280-b628-47ec-b6f9-8af82d64bb28'::uuid), -- Forced Perch
    ('9e1a7a9a-42b0-4bce-acdc-ef91eecdd781'::uuid), -- Fortress Navigation
    ('eaeebc88-f7dd-411a-8591-2a740705fc70'::uuid), -- FSG
    ('b36468a1-8813-4561-a471-a58e0d4f7a28'::uuid), -- Glitchless
    ('6df3880e-c029-4f5d-8d38-fd4f7907acc7'::uuid), -- Half Bow
    ('17fa7c3d-f0f0-4a07-921a-6e862137a69c'::uuid), -- Lava Pool
    ('f361c66a-07ab-4fdd-84bb-8d6548964d48'::uuid), -- Magma Ravine
    ('ea1eef03-66b4-4377-a2ab-d783a2bbe7aa'::uuid), -- Matchmaking
    ('3343e84e-b75f-4ad9-babe-6dba84590a89'::uuid), -- Microlensing
    ('b7e4e72c-eadc-4d89-9f3a-bc2fa4e1c123'::uuid), -- Nether Entry
    ('67321e61-3208-463e-bb30-ade177577889'::uuid), -- Placement Match
    ('814982d5-30b4-4ee4-9b26-3b2fd2d85463'::uuid), -- Portal Room
    ('6924ba84-ad16-40dc-ab58-6bd51383b0df'::uuid), -- RNG
    ('2cebc9c2-3f77-4226-b8e6-946078738f8f'::uuid), -- Ruined Portal
    ('023a8072-ba50-4ede-81be-7da643e32093'::uuid), -- Shipwreck
    ('f7f7756d-dbab-4d2b-90cb-44400e77801e'::uuid), -- SpeedRunIGT
    ('3482ce6e-a7fb-494c-ad80-f3642bcd5078'::uuid), -- StandardSettings
    ('14343701-4695-4443-919a-29f291ea0888'::uuid), -- Starter Staircase
    ('eb64f87c-1ca1-49f8-876f-cfe14d037d3c'::uuid), -- Stronghold Navigation
    ('547d3255-5069-47c0-9c30-757598876aee'::uuid), -- Village
    ('9b4f7ee8-d752-40ef-9d71-ff5c6c1c0013'::uuid)  -- WorldPreview
on conflict (term_id) do nothing;

commit;
