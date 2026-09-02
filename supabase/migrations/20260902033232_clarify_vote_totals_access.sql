-- Keep catalog documentation aligned with the final RPC-only read model.
comment on table public.glossary_vote_totals is
  'Aggregate glossary vote counts exposed to anonymous clients only through get_glossary_vote_totals(); writes only through cast_glossary_vote().';
