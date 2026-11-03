# QA branch migration failure — forensic finding (2026-11-03)

## Disposition

**QA branch status remains `MIGRATIONS_FAILED`. Do not reset, delete, recreate, rebase, or merge this branch as a workaround.** The branch contains synthetic acceptance data that must be preserved. No schema, data, migration-ledger, or branch mutation was performed during this investigation.

- Supabase branch: `bethag-launch-qa`
- Branch ID: `bb7388ab-3007-4de0-9ff6-437a9c53690e`
- Project ref: `jhuyhlzzydcgghrzeexn`
- Parent Production project: `tctcgptrsmvgajqjgnev`
- Provider-reported branch status: `MIGRATIONS_FAILED`

## Confirmed initial migration error

Read-only PostgreSQL logs show the initial migration failure at `2026-11-02T01:48:44.787Z`, SQLSTATE `42P01`: `public.portal_access` did not exist when `20260928043547_restrict_data_api_table_grants.sql` attempted to revoke privileges from it. The archived SQL confirms that this statement references `portal_access` before it existed in the historical replay order.

The later clean baseline `20261017000001_bethag_baseline_schema.sql` creates `public.portal_access`, which explains why the isolated baseline reconstruction succeeds. The initial failure is a historical migration-order/dependency defect, not evidence that the current table is missing.

## Current QA database — read-only verification

| Check | Result |
|---|---:|
| Public tables / migration ledger rows | 47 / 47 |
| Sorted migration head | `20261103072843_qa_align_transfer_wrapper_empty_search_path` |
| `workspace_members.data` jsonb / `condominiums.archived_at` | Present / present |
| `portal_access` and case-insensitive unique index | Present / present |
| Transfer wrapper SECURITY DEFINER | false |
| service_role private schema USAGE / transfer EXECUTE | true / true |
| authenticated / service_role MAINTAIN on public tables | 0 / 0 |

Current fixture counts: 1 workspace, 3 workspace members, 63 condominiums, 13 condominium members, 60 units, 14 fiscal years, 14 ledger entries, 13 installments, 4 documents, 4 communications, 2 portal accesses. No transfer draft exists at the time of this snapshot.

The QA ledger is not the same as Production 247-row ledger: it contains 16 historical rows, five baseline rows, twelve canonical hardening increments and fourteen QA-specific repair/forward rows.

## Safe disposition

The database and fixtures are present, but the provider still reports `MIGRATIONS_FAILED`. Current schema/ledger checks do not prove the provider branch deployment action has been rerun successfully. The connected tools do not expose the provider branch action log or a safe retry operation.

Inspect Supabase Dashboard → Manage Branches → `bethag-launch-qa` → View logs. Do not reset, delete, recreate, rebase, or manually insert a migration-ledger row while the QA fixtures are needed. If clearing the status requires destructive branch replacement, first export and verify all fixtures/configuration and obtain explicit approval.

Release gate remains BLOCKED until the provider status is cleared non-destructively and authenticated APP acceptance is rerun.