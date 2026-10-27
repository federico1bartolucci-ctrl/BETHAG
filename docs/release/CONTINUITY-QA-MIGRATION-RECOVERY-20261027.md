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

## Recovered SQL and comparison

The original SQL statements were recovered directly from the live continuity QA migration ledger. Exact statement: `REVOKE MAINTAIN ON TABLE public.condominium_legal_cases FROM service_role;`.

This is a one-table revocation and is narrower than the canonical migration, which revokes `MAINTAIN` from `service_role` on all 47 named public tables and also revokes its default `MAINTAIN` grant for tables created by `postgres` in schema `public`. The QA-only row is historical evidence of a targeted cleanup, not a replacement for the canonical migration. Keep its ledger identity intact; do not create a canonical source file under the QA timestamp or replay the row.

## Retrieval evidence

Read-only query against `srkucrdcoswlozifvztr` selected `version`, `name`, and `statements` for version `20261027012138`. The returned row matched the recorded migration name and contained exactly the statement shown above. No write query was issued.

## Disposition

The SQL recovery and canonical comparison are complete. A fresh read-only privilege check reports `service_role_has_maintain = false` for `public.condominium_legal_cases` and `public_tables_with_maintain = 0` across public tables in continuity QA. The targeted row is therefore documented as an extra QA cleanup step; it is not missing from the effective security state and does not require replay. Preserve the historical ledger identity.

## Production safety

No Production schema, data, ACL, or migration ledger change was performed as part of this recovery attempt. Production cutover remains blocked by the separate backup/restore, privilege parity, and approval gates.
