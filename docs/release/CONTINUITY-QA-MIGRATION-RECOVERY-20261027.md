# Continuity QA migration recovery note — 2026-10-27

## Scope

Read-only follow-up for the continuity QA ledger row:

- Project: `srkucrdcoswlozifvztr`
- Recorded identity: `20261027012138_revoke_remaining_service_role_maintain_legal_cases`
- Canonical comparison candidate: `supabase/migrations/20261023000003_revoke_service_role_maintain.sql`

## Evidence confirmed

1. Supabase `list_migrations` confirms the row exists in the continuity QA migration ledger at version `20261027012138`.
2. The release inventory reports that, after this QA-only step, the live catalog check found zero public table `MAINTAIN` grants for `service_role`.
3. The canonical migration explicitly revokes `MAINTAIN` from `service_role` on 47 named public tables and revokes its default `MAINTAIN` grant for tables created by `postgres` in schema `public`.

## Not established

- The original SQL statements have now been recovered directly from the live continuity QA migration ledger. Exact statement: `REVOKE MAINTAIN ON TABLE public.condominium_legal_cases FROM service_role;`.
- This is a one-table revocation and is narrower than the canonical migration, which revokes `MAINTAIN` from `service_role` on all 47 named public tables and also revokes its default `MAINTAIN` grant for tables created by `postgres` in schema `public`.
- The QA-only row is historical evidence of a targeted cleanup, not a replacement for the canonical migration. Keep its ledger identity intact; do not create a canonical source file under the QA timestamp or replay the row.

## Retrieval evidence

Read-only query against `srkucrdcoswlozifvztr` selected `version`, `name`, and `statements` for version `20261027012138`. The returned row matched the recorded migration name and contained exactly the statement shown above. No write query was issued.

## Safe next step

Use an authorized SQL editor or an export of `supabase_migrations.schema_migrations` on continuity QA to retrieve the row's `version`, `name`, and `statements`. Review the complete SQL against the canonical comparison candidate. Keep this historical row untouched. If the body proves to be a narrower explicit-object revocation, record the exact delta and address any missing privileges with a separate forward-only migration after review. Do not replay or rewrite the applied QA row.

## Production safety

No Production schema, data, ACL, or migration ledger change was performed as part of this recovery attempt. Production cutover remains blocked by the separate backup/restore, privilege parity, and approval gates.
