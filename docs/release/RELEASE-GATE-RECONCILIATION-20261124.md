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
