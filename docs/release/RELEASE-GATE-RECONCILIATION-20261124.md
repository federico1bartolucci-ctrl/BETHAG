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


## Rilievo critico — registry Production riletta in sola lettura (2026-11-24)

Lettura diretta read-only delle migration registry tramite Supabase:
- Production project `tctcgptrsmvgajqjgnev`: **267 righe**, prima versione `20260928021707`, ultima `20261105050000`.
- QA project `jhuyhlzzydcgghrzeexn`: **283 righe**, ultima versione `20261105001928`.
- L'insieme delle 267 coppie versione/nome Production coincide con l'insieme composto dalle 248 coppie dello snapshot storico e dalle 19 migrazioni elencate nella sequenza canonica congelata: nessuna coppia mancante o aggiuntiva. L'ordine della sequenza nel manifest non coincide con l'ordinamento cronologico della registry; la verifica è stata quindi effettuata sull'insieme delle coppie, non sulla posizione.
- Il manifest congelato continua tuttavia a riportare le 19 migrazioni come `PENDING_NOT_APPLIED`; lo snapshot Production versionato nel repository è del 7 novembre e riporta 248 righe.

**Interpretazione prudenziale:** la registry Production oggi registra tutte le 19 versioni previste, ma questa sola lettura non prova quando siano state applicate, da quale procedura, né che le postcondizioni di schema/ACL siano soddisfatte. Non modificare retroattivamente il manifest congelato e non dichiarare cutover certificato sulla sola base del conteggio. È necessaria una riconciliazione read-only delle postcondizioni e della provenienza, prima di qualunque decisione.

Nessuna scrittura SQL, migrazione, deploy o altra modifica è stata eseguita su Production o QA durante questa lettura. Questo rilievo sostituisce l'assunzione operativa precedente secondo cui la registry Production risultava ancora a 248 righe, ma non autorizza alcuna azione correttiva.


## Audit read-only delle postcondizioni Production — 2026-11-24

Eseguito con sole query `SELECT` sui cataloghi PostgreSQL di Production (`tctcgptrsmvgajqjgnev`) e confronto QA (`jhuyhlzzydcgghrzeexn`). Nessuna DDL/DML eseguita.

### Registry e provenienza disponibile

La tabella `supabase_migrations.schema_migrations` in Production contiene 267 righe e le colonne:
`version`, `name`, `statements`, `created_by`, `idempotency_key`, `rollback`.
Per tutte le 19 versioni della sequenza congelata:
- versione e nome coincidono con il manifest;
- `created_by = 'bethag-reviewed-cutover'`;
- `statement_count = 1`;
- `idempotency_key = NULL`;
- `rollback_count = NULL`.

Quindi il ledger conserva un'etichetta di esecutore e il testo dello statement, ma **non conserva un timestamp di applicazione né una chiave idempotente**. L'etichetta non dimostra da sola chi abbia materialmente lanciato le query o in quale finestra. Non è stata trovata, con queste fonti, una prova indipendente e datata dell'esecuzione. La presenza delle righe è certa; la provenienza temporale resta NON DIMOSTRATA.

### Postcondizioni osservate in Production

- Migrazioni 1–2 e 16, 18: default ACL per oggetti pubblici creati da `postgres`: `authenticated` ha solo CRUD sulle nuove tabelle; `service_role` ha CRUD + REFERENCES/TRIGGER/TRUNCATE; nessun default applicativo per `anon`; nessun default EXECUTE/sequence per PUBLIC, anon, authenticated o service_role. Le ACL proprie di `postgres` non sono state confuse con privilegi assegnati ai ruoli applicativi.
- Migrazioni 3, 4, 9, 10, 11 e 17: wrapper pubblico `close_condominium_member_transfer(uuid)` è SECURITY INVOKER; EXECUTE è negato ad anon e consentito ad authenticated/service_role. Gli helper di chiusura sono negati ad anon; le due funzioni trigger pubbliche sono negate ad anon/authenticated e consentite a service_role. `authenticated` e `service_role` hanno USAGE sullo schema private; l'implementazione privata di chiusura è SECURITY DEFINER.
- Migrazioni 5–8: sulle 47 relazioni public interrogate, MAINTAIN effettivo è zero per authenticated e service_role; privilegi strutturali TRUNCATE/REFERENCES/TRIGGER di authenticated sono zero; MAINTAIN di anon è zero. Default ACL pubblici osservati coerenti con la lista prevista.
- Migrazione 12: entrambe le funzioni private di autorizzazione moduli contengono il controllo del valore booleano JSON `= 'true'::jsonb`.
- Migrazioni 13–14: `workspace_members.data` è jsonb NOT NULL con default `{}`; `private.save_condominium` conserva `archived_at`, `archived_by` e `archive_reason` durante l'upsert.
- Migrazione 15: funzioni private archive/restore presenti e SECURITY DEFINER; trigger `trg_apply_incoming_transfer_member_metadata` presente su `public.condominium_members`; ACL strutturali authenticated su `public.condominium_fund_availability` assenti; helper `private.is_workspace_staff` non direttamente eseguibile da authenticated.
- Migrazione 19: `private.complete_portal_registration` e `private.admin_approve_portal_registration` contengono i guard-rail di ambiguità intra-workspace e il locking `FOR UPDATE`; helper `private.upsert_portal_access_for_member` non è eseguibile da anon/authenticated/service_role.

**Esito tecnico:** tutte le 19 postcondizioni catalogabili sopra risultano coerenti con il codice delle migrazioni e con le query read-only eseguite, nei limiti degli oggetti/condizioni esplicitamente interrogati. Non equivale a certificazione completa di ogni singolo test applicativo o di ogni postcondizione non inclusa nelle query.

### Differenze QA rilevate

- QA non contiene la versione Production `20261105050000` e mantiene una definizione precedente delle funzioni di registrazione portale: non presenta i due guard-rail di ambiguità verificati in Production.
- QA conserva un default `UPDATE` su sequence public per `service_role`, assente in Production.
- QA contiene 283 righe e migrazioni proprie ulteriori rispetto alla sequenza Production; non è quindi corretto aspettarsi uguaglianza numerica o di insieme senza una specifica riconciliazione di ambiente.

### Stato del gate

Le postcondizioni principali delle 19 migrazioni risultano presenti in Production; il ledger le attribuisce a `bethag-reviewed-cutover`, ma non consente di ricostruire data/ora o prova esterna di esecuzione. Serve ancora una fonte indipendente (runbook firmato, log operativo conservato o evidenza di cutover) per chiudere la provenienza. Il manifest storico non viene alterato e rimane congelato. Nessuna modifica Production/QA è stata eseguita. Production resta **NO-GO** fino alla chiusura dei gate di approvazione e preflight; PR #389 resta Draft.
