# BETHAG — riconciliazione evidenze QA e gate release

Data: 2026-11-24  
QA source SHA verificato: `cb202da730000f5cbf631966841812c5bf8e662c`

## Evidenze exact-head registrate

Il file `supabase/rebuild/qa-final-collaudo-20261105.json` è stato riallineato ai tre workflow completati sul medesimo SHA:
- Final authenticated QA: run 45387686799 — SUCCESS.
- Build/PostgreSQL 17: run 45387686747 — SUCCESS.
- Baseline Safety: run 45387686644 — SUCCESS.

Il campo `reviewed_head_sha` e i tre `head_sha` ora identificano il commit QA effettivamente testato, `cb202da730000f5cbf631966841812c5bf8e662c`.

## APP-12: distinzione obbligatoria

Sul run QA exact-head:
- pubblicazione, preparazione destinatari e gestione webhook sintetici firmati: PASS;
- probe di invio live Resend: SKIPPED, esplicitamente escluso dal perimetro autorizzato;
- nessuna email esterna è stata inviata in questo run.

L'evidenza storica di consegna Resend presente nel precedente registro era riferita a un diverso SHA e non viene trasferita al run corrente. Il registro aggiornato mantiene APP-12 funzionale PASS, ma registra `provider_delivery: NOT_RUN`.

Il readiness checker richiede una prova provider delivery positiva e il runner guarded richiede l'attestazione esplicita `BETHAG_QA_APP12_PROVIDER_VERIFIED=YES`. Pertanto il gate provider resta intenzionalmente bloccato. Non va aggirato né sostituito con i webhook sintetici. Un eventuale probe reale richiede autorizzazione esplicita separata e destinatario di test controllato.

## Stato release

- Build, PostgreSQL 17, Baseline Safety e collaudo QA applicativo: PASS sullo SHA QA indicato.
- APP-14: non eseguito; richiede cutover, postflight e smoke autenticati Production.
- Provider delivery live exact-head: NOT RUN.
- Preflight guarded locale exact-execution-SHA: non attestato da questa registrazione.
- Backup/Data API, operatore, manutenzione e approvazione del candidato corrente: da riconfermare.
- Production: NO-GO.
- PR #389: resta Draft, non merged.

Questa riconciliazione modifica solo evidenza/documentazione del repository. Non invia email, non modifica QA o Production, non esegue migrazioni, deploy o merge.


## Riconciliazione exact-head CAP — run 45389819328 (2026-11-24)

Candidate PR head verificato: `a3975a8b620597ed037dd79e0c712f6b8a08875f`.

Workflow completati sul medesimo head dichiarato nei metadati GitHub:
- Baseline Safety run 45389819279 — SUCCESS.
- Build/PostgreSQL run 45389819297 — SUCCESS; job `build` e `postgres-bootstrap` entrambi SUCCESS. La rehearsal isolata ha completato bootstrap PostgreSQL 17, 28 migrazioni clean-install, 19 migrazioni canoniche tramite guarded runner e i controlli ACL/security/rollback.
- Final authenticated QA run 45389819328 — SUCCESS; APP-01..APP-13 e APP-15 PASS, APP-14 PARTIAL.

### Checkout QA e identità del codice

Il job QA ha eseguito checkout del merge commit GitHub `55554053b2d103419eae1941d658d1adb2d6faf3`, non del commit branch `a3975a8b620597ed037dd79e0c712f6b8a08875f`. Il passo workflow denominato “Verify checked-out revision” risulta SKIPPED. La verifica indipendente dei metadati Git dei due commit mostra però lo stesso tree SHA `fef903141932e61a7c5ad34ad6bed1134c2d2f90`: il contenuto versionato testato dal QA coincide quindi con quello del candidato PR. La distinzione commit SHA / tree SHA / checkout SHA è conservata nel registro JSON; non viene dichiarato che il checkout commit sia uguale al branch commit.

### Risultati QA e cleanup

- APP-01..APP-13: PASS nel Final QA 45389819328.
- APP-15: PASS; autenticazione/sessione e navigazione per amministratore, collaboratore e condomino PASS.
- APP-12 provider live-send: NOT RUN, esplicitamente escluso dall'autorizzazione QA. Pubblicazione, preparazione destinatari e webhook sintetici firmati: PASS. Nessuna email esterna inviata.
- APP-14: PARTIAL; nessun collaudo Production post-cutover eseguito.
- Il fixture reversibile del piano Portal è stato ripristinato a `free`; il log restituisce `RESTORED`.
- Preview QA arrestata; artifact diagnostico APP-15 caricato (`14918486658`).

Il registro `supabase/rebuild/qa-final-collaudo-20261105.json` è stato aggiornato nel commit `912353e514904dc594b9e04714a6974087efe1b0` con run ID, SHA, tree SHA, stati APP e cleanup. Questo aggiornamento è documentale: non cambia codice applicativo, migrazioni o manifest congelato.

### Gate ancora aperti

Il readiness checker continua correttamente a bloccare il cutover per APP-12 provider delivery NOT_RUN e per gli altri gate operativi non riconfermati sul candidato corrente: approvazione source/execution SHA e fingerprint, attestazione QA acceptance, Data API exposure, preflight Production read-only, piano/finestra e rollback approvati. APP-14 resta successiva al cutover e non è un test da simulare in QA.

Production: **NO-GO**. PR #389: **Draft, non merged**. Nessuna migrazione, deploy, cutover o modifica Production è stata eseguita.


## Riconciliazione successiva — CAP head c6ea5fb4 (24 novembre 2026)

Head PR dichiarato dai metadati GitHub: `c6ea5fb4ca68976eb310502f45730cc0f44ee39c`.

Workflow sul medesimo `head_sha`:
- Baseline Safety run 45390958503 — SUCCESS.
- Build/PostgreSQL 17 run 45390959049 — SUCCESS; job `build` e `postgres-bootstrap` SUCCESS. Rehearsal isolata PostgreSQL 17: bootstrap baseline, 28 migrazioni clean-install, 19 migrazioni canoniche tramite guarded runner, ACL, RLS e rollback: PASS.
- Final QA run 45390958541 — SUCCESS. Tutti gli step applicativi e di cleanup risultano SUCCESS.

### Risultati APP

- APP-01..APP-13: PASS per i gruppi di test eseguiti nel workflow.
- APP-15: PASS; navigazione, autenticazione e persistenza sessione per amministratore, collaboratore e condomino.
- APP-12 provider live-send: NOT RUN, esplicitamente escluso dall'autorizzazione. Nessuna email esterna inviata.
- Ripristino del piano QA: step SUCCESS.
- Stop preview QA: step SUCCESS.
- Diagnostica APP-15 caricata: artifact `14919216319`, SHA-256 `c70391f4a599c5377f22068806922b1430c310e0b914bda2f297b5386dfe2351`.

### Limite di provenienza del checkout

Nel workflow `qa-final-collaudo.yml`, lo step “Verify checked-out revision” è condizionato a `workflow_dispatch`; nell'esecuzione `pull_request` risulta SKIPPED. I metadati del run riportano il PR head `c6ea5fb4...`, ma non abbiamo acquisito una prova indipendente dello SHA/tree effettivamente estratto da checkout. Pertanto l'esito del workflow è SUCCESS, ma la certificazione dell'identità esatta del checkout resta incompleta. Non viene dichiarata equivalenza di tree non verificata.

### Gate release

APP-12 provider delivery NOT_RUN, APP-14 PARTIAL e checkout SHA/tree non verificato. Restano inoltre da riconfermare approvazione owner per source/execution SHA e fingerprint correnti, Data API exposure, preflight read-only dal checkout finale, backup/restore o accettazione rischio aggiornata, operatore, finestra e rollback. Il manifest congelato contiene approvazioni storiche non trasferibili al candidato corrente.

Production: **NO-GO**. PR #389: **Draft, non merged**. Nessuna migrazione, deploy, cutover, merge, invio email o modifica Production eseguita.


## Riconciliazione exact-head CAP — run 45401046145 (2026-11-24)

Candidate CAP head verificato dai metadati GitHub: `c684cc74d8dbac072239eef3aab4d4bab80b45dd`.

Workflow sul medesimo SHA:
- Build/PostgreSQL 17 run 45401046061 — SUCCESS; job `build` e `postgres-bootstrap` SUCCESS.
- Baseline Safety run 45401046100 — SUCCESS.
- Final authenticated QA run 45401046145 — SUCCESS; il checkout richiesto e la verifica esplicita della revisione estratta risultano SUCCESS.

### Accettazione applicativa

- APP-01..APP-13: PASS.
- APP-15: PASS per amministratore, collaboratore e condomino, inclusi navigazione, autenticazione e persistenza sessione.
- APP-12 provider live-send: NOT RUN, escluso dal perimetro autorizzato. Pubblicazione, preparazione destinatari e webhook sintetici firmati: PASS. Nessuna email esterna inviata.
- APP-14: PARTIAL; nessun collaudo Production post-cutover eseguito.
- Fixture reversibile del piano Portal ripristinato: log esplicito `RESTORED`, piano originario `free`.
- Preview QA arrestata; diagnostica APP-15 caricata: artifact `bethag-app15-diagnostics`, ID `14922918775`, digest `sha256:84e3db1413a223488257e835b38d8e67e94dd039798eaeff4406ad620b06949a`.

Il registro `supabase/rebuild/qa-final-collaudo-20261105.json` è stato aggiornato per registrare questo exact-head e i tre run. Il commit documentale di aggiornamento è `ccdea3c43a33282280930081132d95c31eca392b`; non modifica codice applicativo, migrazioni o manifest congelato.

### Fingerprint osservato

Dal log del Final QA:
- `BETHAG_RELEASE_FINGERPRINT=1dab15902dd7d44b0c66364bee093cc60752eb79689542819eb622099153b220`
- `BETHAG_RELEASE_SOURCE_SHA=5d96342209be77e189012dec754bc764999e64e2`
- `BETHAG_RELEASE_CRITICAL_FILE_COUNT=41`

Il source SHA stampato dal fingerprint deriva dal campo storico `user_authorization.approved_commit_sha` del manifest congelato; non coincide con il commit branch/checkout QA `c684cc74...`. Il fingerprint è evidenza di calcolo sui 41 file critici al momento del run, non una nuova approvazione owner per il candidato corrente.

### Limiti della riconciliazione

I file snapshot `production-ledger-20261105.json` e `live-migration-ledgers-20261105.json` mantengono catture del 7 novembre 2026; non sono stati aggiornati né presentati come snapshot freschi. Per il checker attuale risultano quindi da rinfrescare con una nuova lettura read-only delle registry live QA e Production, con confronto ordinato versione/nome. Questa operazione non è stata eseguita in questo passaggio.

APP-12 provider delivery NOT_RUN; APP-14 non eseguito; approvazioni source/execution SHA, Data API, preflight Production, backup/rischio, operatore, finestra e rollback restano gate separati. Production: **NO-GO**. PR #389: **Draft, non merged**. Nessuna migrazione, deploy, cutover, invio email o modifica Production eseguita.
