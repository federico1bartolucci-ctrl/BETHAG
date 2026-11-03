# QA branch migration failure — forensic finding (2026-11-03)

## Disposition

**QA branch status remains `MIGRATIONS_FAILED`. Do not reset, delete, recreate, rebase, or merge this branch as a workaround.** The branch contains synthetic acceptance data that must be preserved. No schema, data, migration-ledger, or branch mutation was performed during this investigation.

- Supabase branch: `bethag-launch-qa`
- Branch ID: `bb7388ab-3007-4de0-9ff6-437a9c53690e`
- Project ref: `jhuyhlzzydcgghrzeexn`
- Parent Production project: `tctcgptrsmvgajqjgnev`
- Provider-reported branch status: `MIGRATIONS_FAILED`

## Confirmed initial migration error

Read-only PostgreSQL logs for the branch show the following failure during branch initialization:

- Timestamp: `2026-11-02T01:48:44.787Z`
- SQLSTATE: `42P01` (`undefined_table`)
- Error: `relation "public.portal_access" does not exist`
- Failing statement: `REVOKE ALL ON TABLE ... public.portal_access ... FROM anon`

The statement is from the recovered Production migration:

`20260928043547_restrict_data_api_table_grants.sql`

The exact archived payload confirms that it revokes and then grants table privileges on `public.portal_access` alongside other tables. At that point in the historical replay sequence, `portal_access` had not yet been created. The later clean baseline schema file `20261017000001_bethag_baseline_schema.sql` does create `public.portal_access`, which explains why the later baseline-based reconstruction can succeed while the earlier historical sequence fails.

This is a migration-order/dependency failure, not evidence that the current `portal_access` relation is missing.

## Current QA database state — read-only checks

The branch database is reachable and currently reports:

| Check | Observed result |
|---|---:|
| Public tables | 47 |
| Migration ledger rows | 47 |
| Sorted migration head | `20261103072843_qa_align_transfer_wrapper_empty_search_path` |
| `workspace_members.data` jsonb | Present |
| `condominiums.archived_at` | Present |
| `portal_access` | Present |
| Case-insensitive portal identity unique index | Present: `uq_portal_access_workspace_condominium_email_ci` |
| Public transfer wrapper SECURITY DEFINER | false |
| service_role private schema USAGE | true |
| service_role private transfer EXECUTE | true |
| authenticated MAINTAIN on public tables | 0 |
| service_role MAINTAIN on public tables | 0 |

Selected QA fixture counts at the time of inspection:

| Table | Rows |
|---|---:|
| workspaces | 1 |
| workspace_members | 3 |
| condominiums | 63 |
| condominium_members | 13 |
| condominium_units | 60 |
| condominium_member_transfers | 0 |
| condominium_fiscal_years | 14 |
| condominium_ledger_entries | 14 |
| condominium_installments | 13 |
| documents | 4 |
| communications | 4 |
| portal_access | 2 |

The current QA migration ledger contains 47 rows: the first 16 historical migrations, five clean-baseline migrations, twelve canonical hardening increments, and fourteen QA-specific repair/forward entries. It is not identical to Production 247-row ledger and must not be represented as such.

## What is and is not proven

**Proven:** the original missing-relation migration failure; the current branch database is reachable; the 47-table inventory and listed schema/security invariants are present; QA fixtures remain in place.

**Not proven:** that Supabase branch deployment action has been rerun successfully or that the provider status has been cleared. The database current schema and ledger do not by themselves clear the provider-reported `MIGRATIONS_FAILED` state.

Supabase current branching troubleshooting guidance directs operators to inspect the branch deployment log in **Manage Branches → branch → View logs**. The connected Supabase tools expose branch status and database logs but do not expose that branch deployment action log or a safe status-retry operation.

## Safe next action

1. Inspect the provider branch deployment log for the original failed action and any subsequent retry.
2. Determine whether Supabase supports retrying the existing branch deployment without resetting its database.
3. If only delete/recreate or reset can clear the status, first export and verify all QA fixtures and configuration, then obtain explicit approval before replacing the branch.
4. Do not use `rebase_branch`, `reset_branch`, `delete_branch`, or a manual migration-ledger insert as a shortcut. Those actions could change schema, discard test data, or create a misleading migration history.

**Release gate:** QA remains blocked until the provider status is cleared through a supported, non-destructive procedure and the authenticated APP acceptance suite is rerun against the resulting branch.