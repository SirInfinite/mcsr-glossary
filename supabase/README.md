# Supabase migrations

The canonical backend architecture, security model, setup steps, moderation
workflow, and verification queries are documented in
[SUPABASE.md](../SUPABASE.md).

The files in [migrations/](migrations/) match the beta project's remote
migration versions. Apply them in filename order. Never edit an applied
migration; create a new timestamped file for later schema, policy, function, or
vote-target changes.
