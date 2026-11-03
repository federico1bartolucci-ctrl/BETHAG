# BETHAG — Production history and canonical cutover rehearsal (2026-11-03)

## Historical Production ledger — forensic finding

The live Production migration ledger contains 247 exact version/name pairs, latest version `20261103070901`. The 247 SQL payloads were recovered separately with database-derived MD5 and character-count evidence.

The recovered 247-row SQL history is **not a self-contained clean bootstrap**. Replaying it from an empty PostgreSQL 17 database stops at `20260928043547_restrict_data_api_table_grants.sql` with `42P01: relation public.portal_access does not exist`. The live table exists, but no preceding recorded payload creates it. A wider catalog/history scan found 13 live public tables without a corresponding CREATE TABLE in the 247-row ledger; `condominiums.archived_at` also exists live without a recorded ADD COLUMN migration.

Diagnostic replay: [run 41697961509](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41697961509). This failure is evidence of missing historical schema provenance. Do not patch guessed DDL into the archive, replay these 247 files, or rewrite the live ledger.

## Canonical clean-install and forward path — rehearsal passed

The separately reviewed canonical sequence passed on isolated PostgreSQL 17:

1. Five clean baseline migrations.
2. Existing canonical Production head `20261022202747`.
3. Three exact Production-forward SQL payloads already represented in the frozen 247-row ledger; their SQL was replayed locally without adding duplicate ledger rows.
4. Fourteen pending canonical incremental migrations through the guarded transactional runner.

[Full CI run 41700744892](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41700744892) passed on commit `befef38d47225454b1617910d92183ef95a16eb6`.

Verified in that run:
- Clean PostgreSQL 17 bootstrap and baseline inventory.
- Exact production-forward SQL payload hashes.
- Guarded runner preserved all 247 historical version/name pairs.
- Exactly 14 canonical version/name pairs added; final ledger 261 rows, sorted maximum remains `20261103070901`.
- Incremental ACL/security postconditions.
- Collaborator module-permission RLS tests.
- Ledger transaction rehearsal.
- Build, communication authorization guards and public-login browser smoke test.

## Current Production security facts

- 47 public relations.
- Authenticated MAINTAIN: 0; service_role MAINTAIN: 0.
- PostgreSQL-owned public/global default MAINTAIN entries: 0.
- Supabase-managed `supabase_admin` default MAINTAIN entries: 3. These are provider-managed and were not changed. Obtain provider guidance or a named security-owner disposition before cutover.
- Public transfer wrapper is SECURITY INVOKER; authenticated/service_role private invocation path is present.
- `workspace_members.data` is not yet present in live Production.
- `save_condominium` does not yet preserve all server-owned archive lifecycle fields.

## Release decision

The isolated technical rehearsal is PASS. **Production cutover remains NO-GO** until all of the following are resolved and approved:

1. Obtain provider guidance or a named security-owner exception for the three Supabase-managed default MAINTAIN entries.
2. Complete APP-01–APP-15 authenticated acceptance evidence.
3. Reconcile QA's `MIGRATIONS_FAILED` status and prove QA/Production equivalence; capture every environment ledger.
4. Complete object-by-object live ACL/ownership/default-privilege parity attestation.
5. Provide provider-backed physical restore evidence, or a named/timestamped/evidence-linked acceptance of the residual restore risk. Do not describe an unperformed provider restore as successful.
6. Obtain written approval naming the exact commit and migration hashes, maintenance window, monitoring and rollback criteria.

## Safety record

- The 247-row historical Production ledger was not changed.
- No baseline rows were inserted into Production.
- No Production or QA schema/data/ACL/ledger was modified during this work.
- No `db push`, remote replay, migration tracking, merge or deploy was executed.
- PR #54 remains a draft and is not authorized for merge or deployment.
