# Recovered Production migration ledger archive

This directory is reserved for the verbatim SQL statement payloads exported from Production `supabase_migrations.schema_migrations`.

These files are forensic historical records only. They are deliberately outside `supabase/migrations/` and must never be applied by the normal migration CLI. Each archived file must retain its exact ledger version, ledger name, and original statement ordering. A separate manifest must record checksums and source provenance.
