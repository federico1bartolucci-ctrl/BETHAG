# BETHAG — Production history and canonical cutover rehearsal (2026-11-03)

## Superseding review — 2026-11-04 (replay pending)

A live Production/QA catalog comparison after the earlier rehearsal found additional QA-proven behavior not covered by the prior 14-increment package:

- 18 authenticated SECURITY INVOKER RPC paths were missing EXECUTE on their guarded private implementations in Production.
- The archive/restore implementation bodies differed from QA.
- The incoming co-owner metadata trigger existed in QA but not Production.
- QA had revoked direct PUBLIC EXECUTE on two trigger functions and revoked authenticated access to the unused private workspace-staff helper.
- The effective relation-ACL comparison found excess `TRUNCATE`, `REFERENCES` and `TRIGGER` for `authenticated` on `public.condominium_fund_availability`; the forward migration explicitly revokes these view privileges. The latest clean-install/cutover replay must be repeated after this amendment.

A new forward-only canonical migration was added:
- `supabase/migrations/20261104130000_reconcile_qa_security_and_coowner_rpcs.sql`
- Git blob SHA: `9c1303943985f12c574cc821b67696478e1fffef`

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
