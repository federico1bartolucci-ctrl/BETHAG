# Recovered Production migration ledger archive

This directory is reserved for the verbatim SQL statement payloads exported from Production `supabase_migrations.schema_migrations`.

These files are forensic historical records only. They are deliberately outside `supabase/migrations/` and must never be applied by the normal migration CLI. Each archived file must retain its exact ledger version, ledger name, and original statement ordering. A separate manifest must record checksums and source provenance.


## Recovery status — 2026-11-03

- Recovered SQL files: **247 / 247** Production ledger entries.
- Every ledger row had exactly one stored SQL statement; the archived `.sql` file contains that statement payload.
- `MANIFEST.csv` records the exact Production version, ledger name, archive filename, statement count, SQL character count, and database-computed MD5 of the stored statement array.
- The files are historical evidence only and are intentionally outside `supabase/migrations/`. Do not run them through the Supabase migration CLI or replay them against any environment.
- Archive branch: `recovery/production-ledger-archive-20261103`.
- Source: live Production `supabase_migrations.schema_migrations`, read-only extraction on 2026-11-03.
