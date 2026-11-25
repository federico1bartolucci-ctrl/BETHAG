# BETHAG — proposta aggiornata cutover ACL globale

**Stato:** DRAFT — NON APPROVATA, NON ESEGUIBILE  
**Rilevazione ledger:** 24 novembre 2026, sola lettura  
**Ramo tecnico:** `fix/postgres-global-function-default-acl-20261124`  
**Commit di base:** `d020633b75b23413c46d0d64ecd4bf1d568565de`

## Stato live verificato

| Ambiente | Ledger | Esito |
|---|---:|---|
| Production | 267 righe, head `20261105050000` | Le 19 migrazioni precedenti sono già presenti con versione/nome corrispondenti |
| QA | 283 righe | Storia distinta; non va resettata né forzata alla parità |

In Production manca solo `20261124234000_revoke_postgres_global_public_function_execute.sql`. Se il preflight finale confermerà lo stesso stato, il ledger atteso sarà 268 righe: 267 storiche preservate + 1 nuova.

## ACL verificati

- Default globale funzioni postgres: `{=X/postgres,postgres=X/postgres}`.
- Default postgres nello schema public: `{postgres=X/postgres}`.
- Default specifici storage: grant a anon, authenticated e service_role da preservare.
- Funzioni public: 130; funzioni con PUBLIC EXECUTE: 0, in Production e QA.

Il difetto riguarda le funzioni future create da postgres; non dimostra un'esposizione delle funzioni public esistenti.

## Sequenza e clean-install

- Migrazioni proposte da aggiungere a Production: **1**, subordinata a nuova approvazione.
- Inventario deployable standard: **28 migrazioni canoniche congelate**. La candidata resta esclusivamente in `supabase/rebuild/drafts` e non è visibile a `supabase db push`.
- Rehearsal della candidata: database PostgreSQL 17 separato e locale/effimero; non fa parte del clean-install standard.
- Hash candidato: `499ea493e828243309ee2f4bb9c3242d2fbeb862`.
- Postflight ipotizzato: ledger 268, head `20261124234000`.

## Gate ancora aperti

1. Preflight/postflight dedicati al ledger live 267→268.
2. Runner separato e fail-closed, senza modificare il runner storico 19/248/267.
3. Clean-install PostgreSQL 17 e rehearsal runner isolata.
4. Regressione ACL sulla revisione finale e CI completa.
5. Compatibilità QA senza reset né scritture remote.
6. Nuovo fingerprint e approvazione esplicita legata al commit e all'hash della migrazione.

## Stato operativo

Nessun merge, deploy, migrazione o modifica a Production/QA. Nessun reset, nuovo ambiente a pagamento o riscrittura delle 267 righe storiche. L'autorizzazione storica per 19 migrazioni non è riutilizzabile.

**Esito:** proposta riallineata ai ledger live; non ancora eseguibile. Punto 3 aperto.

## Rehearsal runner e snapshot live — 24 novembre 2026

- Snapshot completo read-only delle 267 coppie versione/nome Production: `supabase/rebuild/drafts/production-ledger-live-20261124.json`.
- Preflight e postflight SQL dedicati: `production-cutover-preflight-live-20261124.sql` e `production-cutover-postflight-live-20261124.sql`.
- Runner `scripts/apply-live-ledger-acl-rehearsal.mjs`: deliberatamente **solo rehearsal locale**; rifiuta ogni target non loopback e non implementa un percorso Production.
- Test `scripts/test-live-ledger-acl-rehearsal.mjs`: ricostruisce in PostgreSQL 17 isolato le 267 coppie esatte, esegue la candidata in transazione e verifica 268 righe, preservazione delle 267 coppie e revoca dei default globali.
- Il workflow build crea un database CI dedicato per questo test. La rehearsal CI è ancora da eseguire sul nuovo SHA.
- La candidata resta in `supabase/rebuild/drafts`; non è stata aggiunta alla catena `supabase/migrations`. Il runner storico e il freeze 19/248/267 restano intatti.

**Limite esplicito:** il runner appena aggiunto non è un runner di cutover Production. Serve a validare localmente la transazione/ledger e impedire un'esecuzione remota accidentale. Per un eventuale cutover serviranno ancora integrazione controllata clean-install, verifica completa delle catene, un runner Production distinto sottoposto a revisione e nuova approvazione esplicita.


## Rettifica exact-head — 25 novembre 2026

La candidata resta **non deployable**: è conservata solo in `supabase/rebuild/drafts`. Il clean-install standard deve applicare esattamente le 28 migrazioni canoniche congelate; la candidata viene verificata separatamente su PostgreSQL 17 isolato. I controlli di inventario, baseline e runner devono applicare tutti la stessa regola. Nessuna promozione della bozza in `supabase/migrations` è autorizzata da questo documento.

La CI sul commit precedente `19128bdd902d9430bc79e49ac47728714dc83d8f` ha evidenziato un disallineamento: il validatore filename richiedeva 29 file mentre la proposta draft-only ne mantiene 28; il controllo di baseline e il verificatore del runner contenevano ancora l'aspettativa precedente. Le correzioni sono state allineate ai 28 file e alla rehearsal separata; restano da certificare sul nuovo exact-head con Build e Baseline Safety. APP-01..APP-15 resta un gate distinto e non può essere considerato superato se il workflow è SKIPPED.


## Nuova verifica Production read-only — 25 novembre 2026

Rilevazione SQL UTC: `2026-11-24T23:48:57.016286Z` (ora locale italiana: 25 novembre).

- Progetto `tctcgptrsmvgajqjgnev`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.
- `list_migrations`: 267 righe. Confronto integrale con lo snapshot pinned: **267/267 coppie versione/nome identiche**; nessuna coppia solo-live o solo-snapshot.
- Head: `20261105050000 / reconcile_portal_registration_upsert`; candidata `20261124234000` assente.
- Default globale funzioni di `postgres`: `{=X/postgres,postgres=X/postgres}`; nessuna riga globale esplicita in `pg_default_acl`, quindi il grant PUBLIC EXECUTE deriva dal default implicito PostgreSQL.
- Default funzioni schema `public`: `{postgres=X/postgres}`; schema `storage`: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`, da preservare.
- Funzioni in `public`: 130; funzioni con PUBLIC EXECUTE: 0.
- Supabase Security Advisor: 0 security lints.
- Nessun override `pgrst.db_schemas` o `pgrst.db_extra_search_path` rilevato per i ruoli/database ispezionati.

**Data API:** ancora **NOT RECONFIRMED**. Il connettore Supabase fornisce stato progetto e accesso SQL, ma non restituisce il valore effettivo della lista "Exposed schemas" del Dashboard. La precedente evidenza owner registrata nel manifest è del 7 novembre e non soddisfa il gate temporale del runner. La verifica deve essere acquisita direttamente dal Dashboard Production prima di ogni cutover.

## Collaudo QA: modalità disponibile e limite operativo

Il workflow `.github/workflows/qa-final-collaudo.yml` supporta `workflow_dispatch` con input `target_ref` e controlla che il checkout corrisponda esattamente allo SHA richiesto. Il branch corrente è escluso dal trigger automatico PR; il run sullo SHA `e3b9f8a...` è correttamente `SKIPPED`.

Il workflow manuale opera però sul progetto QA condiviso e include fixture temporanee reversibili (tra cui modifica/ripristino del piano Portal), test autenticati e flussi browser. Non è stato avviato: la presente fase mantiene il vincolo di non scrivere su QA senza autorizzazione specifica. Non esiste, tra le azioni GitHub collegate disponibili in questa sessione, un'azione di dispatch workflow.

**Stato dopo questa verifica:** Build, PostgreSQL 17 e Baseline Safety PASS sullo SHA `e3b9f8a...`; il nuovo aggiornamento del manifest richiede una nuova CI exact-head. APP-01..APP-15, Data API Dashboard, revisione tecnica indipendente, riconferma del rischio backup e approvazione owner restano gate aperti. Nessuna scrittura Production/QA.


## Rettifica evidenze Data API già fornite — 25 novembre 2026

Le schermate erano già state inviate dall'owner e vengono ora registrate senza richiederne un nuovo invio.

- **Production, branch `main`, 24 novembre 2026 (evidenza Dashboard acquisita nella conversazione alle 21:30:39 UTC):** schemi esposti 2/3; tabelle 0/48; funzioni 0/173; auto-esposizione nuove tabelle disattivata; Extra search path `public`, `extensions`; Max rows 1000. La schermata Production mostra il conteggio, non i nomi degli schemi.
- **Production, 8 novembre 2026:** precedente schermata con i nomi `graphql_public` e `public` esposti; `private` non esposto; `supabase_functions` assente dalle scelte disponibili.
- **QA, branch `bethag-launch-qa`, 24 novembre 2026, schermata delle 22:36:** `graphql_public` e `public` esposti; `private` non esposto. Questa evidenza è conservata separatamente e non viene usata come prova dell'impostazione Production.

**Disposizione corretta:** la verifica Dashboard Production non è più classificata come del tutto mancante: è riconfermata al 24 novembre per conteggio e impostazioni accessorie. I nomi esatti Production restano supportati dalla schermata Production dell'8 novembre, non da quella Production del 24 novembre. Il runner resta fail-closed se richiede una verifica name-level Production entro 24 ore. Nessuna modifica alle impostazioni Supabase è stata eseguita.


## CI exact-head e aggiornamento evidenze — 25 novembre 2026

Questa sezione supersede le note CI precedenti contenute sopra, che si riferivano a SHA più vecchi.

Commit esaminato: `cb8b3b110349add442711a4e864a58ee35c6bc9e`.

- Build #4693 — **SUCCESS**: include PostgreSQL bootstrap, clean-install delle 28 migrazioni canoniche, rehearsal separata della candidata draft-only, guarded runner 267→268, regressione ACL, test applicativi, compilazione e browser smoke pubblico isolato.
- Baseline Safety #1536 — **SUCCESS**.
- PostgreSQL 17 job `postgres-bootstrap` — **SUCCESS** nello stesso Build.
- Browser smoke pubblico isolato — **SUCCESS**.
- Autenticazione reale QA e diagnostica edit/archive nel Build — **SKIPPED** per condizioni di branch; nessuna scrittura QA eseguita da questi step.
- Final QA APP-01..APP-15 #1373 — **SKIPPED**. Non è un esito PASS e non costituisce accettazione applicativa.

I riferimenti sono registrati nel campo `rehearsal_evidence.exact_head_ci_evidence` del manifest. La CI tecnica exact-head è quindi PASS per Build, Baseline, PostgreSQL 17 e browser smoke isolato; la certificazione APP-01..APP-15 resta distinta e non superata.

La verifica Data API è aggiornata dalla sezione “Rettifica evidenze Data API già fornite”: screenshot Production del 24 novembre riconferma 2/3 schemi esposti e le altre impostazioni visibili; i nomi Production restano documentati dalla schermata Production dell'8 novembre. La schermata QA del 24 novembre resta prova esclusivamente QA. Non si deve chiedere nuovamente all'owner materiale già fornito né trasferire evidenze tra ambienti.

**Stato complessivo invariato:** manifest `DRAFT_NOT_APPROVED`; nessuna revisione tecnica indipendente registrata; nessuna approvazione owner; APP-01..APP-15 non accettati; runner Production non eseguito. Nessuna scrittura su Production o QA.


## Evidenza Data API Production — conferma con nomi, 25 novembre 2026

L'owner ha fornito tre schermate della Dashboard Supabase del progetto BETHAG, ramo `main`, acquisite il 25 novembre 2026 alle 01:21–01:22 CET. La terza schermata espande il selettore “Exposed schemas” e mostra i segni di selezione accanto a `graphql_public` e `public`; `private` è visibile ma non selezionato. Le prime due schermate mostrano i valori e le altre impostazioni.

- Schemi esposti: `graphql_public`, `public` (2/3); `private` non esposto.
- Tabelle esposte: 0/48.
- Funzioni esposte: 0/173.
- Automatically expose new tables: disattivato.
- Extra search path: `public`, `extensions`.
- Max rows: 1000.
- Pool size: configurato automaticamente.

Questa è evidenza diretta Production e sostituisce la precedente limitazione “count-only” del 24 novembre. La prova QA del 24 novembre resta separata e non viene utilizzata per dimostrare la configurazione Production.

**Disposizione:** il gate di evidenza Data API Production con nomi degli schemi e freschezza entro 24 ore è soddisfatto al momento della cattura. Non sono state modificate impostazioni Supabase. Restano separati e obbligatori: riconferma del rischio backup, approvazione owner legata a SHA/fingerprint/hash/progetto/finestra, CI esatta sul commit finale e ogni altro controllo fail-closed del runner. Nessuna scrittura o migrazione Production è stata eseguita.
