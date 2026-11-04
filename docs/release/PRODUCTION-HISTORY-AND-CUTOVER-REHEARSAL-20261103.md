# BETHAG — Production history and canonical cutover rehearsal (2026-11-03)

## Superseding review — 2026-11-04 (replay pending)

A live Production/QA catalog comparison after the earlier rehearsal found additional QA-proven behavior not covered by the prior 14-increment package:

- 18 authenticated SECURITY INVOKER RPC paths were missing EXECUTE on their guarded private implementations in Production.
- The archive/restore implementation bodies differed from QA.
- The incoming co-owner metadata trigger existed in QA but not Production.
- QA had revoked direct PUBLIC EXECUTE on two trigger functions and revoked authenticated access to the unused private workspace-staff helper.
- The effective relation-ACL comparison found excess `TRUNCATE`, `REFERENCES` and `TRIGGER` for `authenticated` on `public.condominium_fund_availability`; the forward migration explicitly revokes these view privileges.
- Effective function ACL comparison found anon inherited EXECUTE on both transfer-closure helpers; the migration revokes PUBLIC/anon while preserving authenticated and service_role execution.
- Production also retained postgres-owned anon CRUD defaults for future public tables; the migration revokes those schema-scoped defaults.
- The latest clean-install/cutover replay must be repeated after these ACL/default-privilege amendments.

A new forward-only canonical migration was added:
- `supabase/migrations/20261104130000_reconcile_qa_security_and_coowner_rpcs.sql`
- Git blob SHA: `a445bc47d71e1d5e27e654e0802d292a8b653d8f`

The frozen package now contains **24 clean-install SQL files** and **15 pending canonical increments**. The expected Production ledger after an approved operation is 262 rows (247 preserved historical rows + 15 canonical increments). The earlier rehearsal run 41819086300 tested only the 23-file/14-increment package and is therefore historical evidence, not proof for this updated package. A fresh PostgreSQL 17 clean-install and guarded-runner replay is required. Production and live QA remain untouched by this migration-file change; no cutover is authorized.
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
- Supabase-managed `supabase_admin` default ACL rows in `public`: 3 (tables, sequences, functions); the table default includes MAINTAIN. These are immutable provider-managed defaults, not application-owned grants. The final 2026-11-04 assessment below supersedes the earlier open disposition.
- Public transfer wrapper is SECURITY INVOKER; authenticated/service_role private invocation path is present.
- `workspace_members.data` is not yet present in live Production.
- `save_condominium` does not yet preserve all server-owned archive lifecycle fields.

## Release decision

The isolated technical rehearsal is PASS. **Production cutover remains NO-GO** until all of the following are resolved and approved:

1. Record the immutable Supabase-managed default ACLs as an accepted provider baseline; do not attempt to revoke them. The final 2026-11-04 assessment below closes this item.
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


## 2026-11-04 — distinzione verificata tra nuova installazione e cutover Production

La cartella `supabase/migrations/` deve contenere **23 file SQL** in ordine cronologico per ricostruire integralmente una nuova installazione:

- cinque migrazioni baseline;
- il precedente head canonico `20261022202747`;
- i quattordici incrementi canonici attualmente mancanti in Production;
- tre migrazioni Production-forward già registrate nella cronologia live, copiate nella cartella deployabile con i **version/name e payload esatti** recuperati dal ledger (`20261102151610`, `20261102200855`, `20261103070901`).

Le tre migrazioni Production-forward non vanno riapplicate all'ambiente Production esistente: i relativi record sono già compresi nei 247 storici. Servono invece alle nuove installazioni, in particolare per ripristinare i permessi RPC di preparazione comunicazioni e l'accesso `service_role` alla RPC privata degli eventi Resend.

Sono quindi due prove distinte e obbligatorie:

1. **Clean install:** esecuzione di tutti i 23 SQL in ordine cronologico su PostgreSQL 17 vuoto, con verifica di schema, privilegi e RPC di comunicazione/Resend.
2. **Cutover Production:** simulazione della situazione live (247 record, incluse le tre migrazioni Production-forward già applicate) e applicazione dei soli 14 incrementi mancanti tramite runner transazionale, per arrivare a 261 record senza modificare i 247 storici.

La prova del cutover non sostituisce quella della clean install e viceversa. Il precedente inventario da 20 file è superato.


### Evidenza CI consolidata — 4 novembre 2026

La GitHub Actions [run 41819086300](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41819086300), sul commit PR `6c0af4a77124cdc8eee7e709856065271598e8bd` (merge-checkout `42765a1183eb1c6490b6a16c68aebf8036e302c9`), è terminata **SUCCESS** per entrambi i job (`build` e `postgres-bootstrap`). Sono passati: `verify:baseline`, verifica security/ACL, build, smoke browser pubblico, baseline PostgreSQL 17, replay cronologico completo dei 23 SQL, rehearsal del runner per i 14 incrementi, verifica hardening incrementale, test RLS dei permessi collaboratore e rehearsal transazionale del ledger. Il clean install ha prodotto 47 tabelle pubbliche, zero privilegi MAINTAIN per i ruoli applicativi e le RPC di comunicazione/Resend con i permessi attesi. Il cutover simulato ha preservato tutte le 247 coppie storiche e aggiunto 14 record, per 261 totali. Nessuna operazione remota su Supabase o Production è stata eseguita.


## Superseding final rehearsal evidence — 2026-11-04 (24 files / 15 increments)

The earlier sections describing the 23-file / 14-increment package and its replay as pending are historical and superseded by this section. The final reviewed package was tested on commit `6d6f4a1fc91918fa4550ba2df4110dda04dc1bf5`.

[Final GitHub Actions run 41902161953](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41902161953) completed with overall **SUCCESS**. Both jobs passed:

- `postgres-bootstrap`: PostgreSQL 17 baseline, all 24 clean-install SQL files in chronological order, all 15 canonical increments through the guarded transactional runner, ACL/security postconditions, collaborator RLS tests and ledger transaction rehearsal.
- `build`: migration/baseline/security verification, communication authorization guards, production build, public-login browser smoke, real QA authentication/session persistence and authenticated QA edit/archive diagnostic.

The isolated cutover rehearsal preserved all 247 historical version/name pairs and added exactly 15 canonical pairs, producing 262 ledger rows. The final sorted ledger head is `20261104130000`. The clean-install sequence contains 24 files: five baselines, one existing canonical head, fifteen pending canonical increments and three exact Production-forward payloads.

The final ACL assertions passed, including authenticated structural privileges on `public.condominium_fund_availability` denied, anon execution of transfer-closure helpers denied, authenticated execution retained, and anon default CRUD on future public tables removed. Collaborator permission false/true behavior and the archive/co-owner lifecycle checks also passed.

**Scope limitation:** this is a successful isolated PostgreSQL 17 rehearsal and QA browser diagnostic, not a provider-backed physical restore and not a Production cutover. No remote Supabase DDL/ledger writes, merge or deployment were performed. Production remains NO-GO pending APP-01–APP-15 acceptance, backup/restore gate and written cutover approval naming the exact commit/hashes, window and rollback criteria. The immutable `supabase_admin` defaults have been assessed and accepted as provider-managed baseline; they are no longer a standalone blocker.

## Superseding provider-managed default ACL assessment — 2026-11-04

The earlier requirement to obtain provider guidance or a security-owner exception for the three `supabase_admin` default ACL rows in `public` is superseded by the official Supabase Knowledge Base article, updated 2026-11-04: [Can't change the default privileges of supabase_admin in the public schema](https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema-448af9).

Supabase documents that these defaults belong to its internal `supabase_admin` role and cannot be changed by `postgres`, because role membership is reserved to Supabase. They apply only to objects created by `supabase_admin`; they are not the defaults for application objects created by `postgres`. The supported controls are to manage `postgres`'s own defaults and keep extensions out of `public`.

Read-only catalog checks on both live projects confirmed:

- Production and QA each have exactly three `supabase_admin` default ACL rows in `public` (tables, sequences and functions); the table default includes MAINTAIN.
- The three `public` default ACL rows match between Production and QA.
- No current relation in `public` is owned by `supabase_admin`.
- No installed extension is installed in `public`; the installed extensions are in `extensions`, `vault` or `pg_catalog`.
- QA additionally has three `supabase_admin` default ACL rows in the provider-managed `supabase_functions` schema; Production does not. This is a provider/system-schema difference, not an application-schema grant. It is preserved and not normalized by BETHAG migrations.

**Disposition: ACCEPTED_PROVIDER_MANAGED_BASELINE.** Do not attempt `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`, do not alter provider-owned schemas, and keep extensions outside `public`. Continue auditing effective grants on actual BETHAG relations, views and functions. Confirm the exposed-schema configuration for `supabase_functions` as part of the final release attestation.

This assessment was read-only: no Production or QA DDL, ACL, data or migration-ledger writes were performed.
