# BETHAG — Migration source recovery attempt

**Date:** 2026-10-01  
**Branch used for documentation:** `bethag-migration-repair`  
**Production access:** read-only; no database writes performed.

## Scope

Attempted to locate the exact original SQL source for the migration recorded in production history as `20260928043547_restrict_data_api_table_grants`.

## Results

| Location checked | Result |
|---|---|
| `main` exact path `supabase/migrations/20260928043547_restrict_data_api_table_grants.sql` | Not found (GitHub 404) |
| `bethag-migration-repair` exact path | Not found (GitHub 404) |
| `backup/pre-rollback-20261001` exact path | Not found (GitHub 404) |
| Commit search for `restrict_data_api_table_grants` in the repository | No matching commits returned |
| Commit search for version `20260928043547` | No matching commits returned |
| Commit search for `initial_bethag_backend` | No matching commits returned |

The repository's `main` branch contains 121 files under `supabase/migrations`, but none is named for the missing grant-hardening migration or the original initial schema migration. The recovery branch contains 132 migration files and likewise does not contain the exact grant-hardening migration path.

## Interpretation

The exact original migration source was not recoverable from the checked repository paths and commit search. This does **not** establish that the migration's effects are absent from production or that no copy exists elsewhere (for example, a local archive or another repository). No replacement SQL has been inferred or authored because grant-hardening behavior is security-sensitive and must be based on trustworthy evidence.

## Required source inputs

To continue exact source recovery, obtain at least one of:
- the original SQL file from the author's local project/archive;
- an export or backup of the original repository state containing that file;
- an authoritative deployment artifact that preserves the exact migration contents.

If none is available, classify the migration as **source unavailable** and separately design a newly reviewed security migration from the current verified privilege inventory. Such a replacement would be new work, not a reconstruction of the original file, and must be tested only in isolated QA before any production consideration.

## Safety disposition

No migration was applied, no database reset was performed, and no production data, schema, grants, or migration history was changed. This note is documentation only.
