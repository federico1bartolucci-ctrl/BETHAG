# Candidate replay sequence — Production ledger recovery

This directory contains a byte-for-byte staging copy of the 247 SQL payloads recorded in the live Production migration ledger on 2026-11-03.

## Safety
- This is a disposable replay candidate, not the canonical deploy directory.
- It is intentionally outside `supabase/migrations/`; normal Supabase CLI commands will not discover it as migrations.
- Never apply this directory to Production or QA.
- Before any replay, copy it into an isolated disposable PostgreSQL 17 test workspace and provide the Supabase platform prerequisites (notably auth/storage schemas and roles) in a controlled bootstrap.
- A successful SQL replay does not itself authorize a production cutover.

## Ordering
Files are named with the exact 14-digit Production ledger version. All 247 versions are unique. Lexicographic filename order therefore preserves the ledger's version order.

## Source of truth
The authoritative recovered payloads and checksums are in `../recovered-production-ledger/`. This staging directory reuses the same Git blobs; it does not rewrite SQL.
