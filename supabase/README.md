# Supabase migrations

The canonical backend architecture, security model, setup steps, moderation
workflow, and verification queries are documented in
[SUPABASE.md](../SUPABASE.md).

The files in [migrations/](migrations/) are the tracked deployment order. Check
the remote migration list before deployment and apply pending files in filename
order. Never edit an applied migration; create a new timestamped file for later
schema, policy, function, or vote-target changes.
