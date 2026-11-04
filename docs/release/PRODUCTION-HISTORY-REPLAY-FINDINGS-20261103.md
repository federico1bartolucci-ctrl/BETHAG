# BETHAG — Production migration history replay findings (2026-11-03)

## Decision

**The 247-row Production migration ledger is recoverable as historical evidence, but it is not a self-contained clean-bootstrap sequence. Do not use the recovered 247 files as the canonical clean-install migration directory and do not rewrite the live Production ledger to make it appear replayable.**

The archive remains valuable: it preserves the exact SQL statements recorded as applied in Production, with database-captured MD5 and character-count evidence. It must remain separate from any future deployable baseline.

## Evidence

### Archive integrity

- Production ledger: 247 versions, from `20260928021707` through `20261103070901`.
- All 247 SQL payloads are archived separately under `supabase/recovered-production-ledger/`.
- CI validates all 247 archived files against the manifest's database-captured MD5 and character counts.
- The candidate replay branch contains exactly 247 unique timestamped files in `supabase/migrations/`; all 247 are byte-identical to the archive and have no duplicate prefixes.

### Clean replay failure

Local Supabase with PostgreSQL 17 successfully started. The first replay stopped at:

`20260928043547_restrict_data_api_table_grants.sql`

PostgreSQL error: `42P01: relation public.portal_access does not exist`.

That migration revokes/grants privileges on `public.portal_access`, but none of the preceding recorded Production SQL payloads creates that table. A read-only Production catalog inspection confirms that `public.portal_access` exists in the live database with 15 columns, 7 constraints, 8 indexes, 2 RLS policies and 3 triggers. The historical ledger therefore assumes schema state that was not created by the SQL recorded in that ledger.

A broader read-only scan of all 247 recorded SQL payloads found no matching `CREATE TABLE` statement for these 13 live public tables:

- `communication_recipients`
- `condominium_accounting_settings`
- `condominium_expense_allocations`
- `condominium_fiscal_carryovers`
- `condominium_fiscal_years`
- `condominium_funds`
- `condominium_installments`
- `condominium_ledger_entries`
- `condominium_member_transfers`
- `condominium_millesimal_tables`
- `condominium_millesimal_values`
- `condominium_payment_movements`
- `portal_access`

A further read-only catalog/history check confirms that Production currently has `condominiums.archived_at`, but none of the 247 recorded SQL payloads adds that column. The ledger first references `archived_at` in version `20261001083704`. This is independent evidence of pre-existing schema state not represented by the migration history.

Replay CI: [run 41697961509](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41697961509) — failed at the first missing dependency above. This failure is a deliberate diagnostic finding, not a reason to patch the live database or silently skip the failing migration.

## Canonical rebuild path

The safe path is the separately reviewed clean baseline, not a blind replay of the incomplete historical sequence:

- Five ordered baseline migrations reconstruct the current schema, indexes/views, functions, RLS/security and grants.
- The reviewed incremental migrations apply the post-baseline hardening and application changes.
- The real PostgreSQL 17 workflow on [run 41459214926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41459214926) passed both the baseline bootstrap and the guarded canonical incremental migration/rehearsal jobs.

That successful isolated CI run is evidence for the clean candidate only. It does not authorize Production cutover or prove that the remote migration ledger has been reconciled.

## Required remaining gates

1. Freeze the clean baseline plus its exact ordered incremental migration list and SHA-256 inventory.
2. Re-run the complete clean bootstrap and all incremental/postcondition tests on the current candidate commit.
3. Compare the resulting schema, columns, constraints, indexes, functions, triggers, RLS policies, ownership, grants and default privileges against live Production.
4. Resolve the Supabase-managed `supabase_admin` default-ACL MAINTAIN divergence with provider guidance or an explicitly approved risk disposition.
5. Define and rehearse a guarded migration-ledger tracking cutover that does not execute historical SQL against Production and does not modify application data.
6. Obtain formal cutover approval. Until then: NO-GO.

## Safety record

- No Production schema, data, ACL or migration ledger was modified.
- No QA schema, data or migration ledger was modified during this replay investigation.
- No merge, remote replay, reset, `db push` or deployment was performed.
- PR #52 is a draft forensic candidate and must not be merged as the application migration chain.
