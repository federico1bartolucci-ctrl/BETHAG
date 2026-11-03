# Disposable replay baseline

This directory contains schema objects that demonstrably predate the first entry in Production's recovered migration ledger.

## portal_access

The first 16 recovered ledger payloads do not create `public.portal_access`. The 17th payload (`20260928043547_restrict_data_api_table_grants`) revokes/grants privileges on it; subsequent early payloads alter its existing RLS policy and create indexes against it. The table therefore existed before the first recorded migration and must be present when replaying the ledger.

The baseline SQL is intentionally separate from:
- `supabase/recovered-production-ledger/`: verbatim SQL payloads from the live Production ledger;
- `supabase/replay-candidate/`: byte-identical copies of those 247 payloads.

Its table columns, constraints, and indexes were reconstructed from a read-only Production catalog inspection on 2026-11-03. The pre-existing resident SELECT policy is included because migration `20260928043618` alters that named policy rather than creating it.

This is a **test-only prerequisite** for the disposable PostgreSQL 17 replay. It is not a new Production migration, must not be deployed to QA or Production, and must not be added to the recovered 247-entry archive. If additional pre-ledger objects are discovered by subsequent replay failures, document and isolate them here rather than editing historical payloads.

## Resident access helper

The recovered `20260928043823_restrict_private_security_definer_functions` payload also revokes and grants EXECUTE on `private.can_access_resident_condominium(uuid)`. Its first definition in the recorded ledger is later, at `20260930185324_optimize_private_auth_rls_helpers`. The earlier ACL operation therefore proves that this helper was present in Production before that ledger entry, but its original out-of-ledger definition is not preserved in the 247 payloads.

For replay only, the baseline seeds the earliest recoverable implementation from the later recorded migration. That later migration still executes in chronological order and replaces the helper with its exact ledger definition. This is an explicit reconstruction assumption, not a claim that the 20260930185324 SQL was the original pre-ledger source.
