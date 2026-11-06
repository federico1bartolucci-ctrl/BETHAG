# BETHAG — stato release verificato
**Data verifica:** 2026-11-06  
**Repository:** `federico1bartolucci-ctrl/BETHAG`  
**PR di rilascio:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Branch:** `fix/qa-view-acl-parity-20261105` → `main`  
**Commit applicativo verificato:** `6988383794995748436aaa691e8a08ed41eb8188`

## 1. Evidenze QA aggiornate

Le seguenti esecuzioni GitHub Actions sono associate al commit applicativo indicato e risultano completate con esito SUCCESS:

- [Final QA APP-01..APP-15 — run 42132736491, workflow n. 145](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736491)
- [Build + PostgreSQL bootstrap — run 42132736459, workflow n. 3097](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736459)
- [Baseline Safety — run 42132736537, workflow n. 331](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736537)

Nel job Final QA sono terminati con SUCCESS i passaggi APP-01..04/APP-13, APP-05..07, APP-08..11, APP-12, i flussi browser autenticati e APP-15. APP-15 ha verificato amministratore, collaboratore e condomino, navigazione consentita, restrizioni di ruolo, autenticazione Supabase e persistenza sessione.

APP-12 include preparazione/pubblicazione comunicazioni, webhook sintetici firmati, rifiuto della firma invalida e probe/consegna di messaggi di test tramite Resend. La prova non costituisce certificazione di deliverability su volumi Production.

APP-14 resta PARTIAL perché comprende il cutover e la verifica post-cutover Production, non perché manchi il collaudo applicativo QA.

## 2. Rehearsal e migrazioni

- Clean install: 28 migrazioni provate su PostgreSQL 17 isolato.
- Runner guarded: 19 migrazioni canoniche forward-only provate su database isolato.
- Storico Production da preservare: 248 righe.
- Ledger atteso dopo il cutover: 267 righe.
- Test isolati di ACL, colonna profilo workspace, rollback subentro e permessi collaboratore: PASS.

Nessuna delle 19 migrazioni è stata applicata a Production durante questa verifica.

## 3. Stato live verificato

**Production Supabase** `tctcgptrsmvgajqjgnev`:
- stato ACTIVE_HEALTHY, PostgreSQL 17.6;
- ledger: 248 righe, head `20261104222229`;
- query live read-only del 2026-11-06: confermati database PostgreSQL 17.6, ruolo di lettura `postgres`, 248 righe e head invariato;
- Security Advisor: zero lint; Health Advisor: zero lint;
- preflight read-only documentato PASS;
- Data API: `public` esposto, `private` non esposto, `supabase_functions` non esposto, `graphql_public` aggiuntivo esposto, auto-expose OFF sulla base delle schermate Production fornite il 2026-11-05.

**QA esistente** `jhuyhlzzydcgghrzeexn`:
- branch `bethag-launch-qa` conservato, senza reset o ricreazione;
- stato branch FUNCTIONs_DEPLOYED e preview ACTIVE_HEALTHY secondo l'inventario Supabase;
- ledger letto: 283 righe. Le differenze rispetto alle 248 righe Production sono storiche e già classificate; non pareggiare i conteggi e non riscrivere le identità dei record.

## 4. Divergenze Production già note e coperte dal piano

La Production non è ancora allineata al candidato applicativo. Il report APP-14 documenta, tra l'altro:
- assenza di `workspace_members.data`;
- assenza del trigger/funzione per i metadati dei comproprietari in ingresso;
- controllo dei permessi collaboratore che non tratta correttamente il valore booleano `false`;
- grant EXECUTE mancanti per le implementazioni private previste;
- differenze di default ACL da correggere senza modificare i default provider-managed.

Le correzioni sono già incluse nei 19 payload forward-only congelati. Non è emersa la necessità di aggiungere una ventesima migrazione. Non creare patch speculative e non modificare manualmente il ledger.

Il restore logico locale è stato verificato. Il restore fisico provider-managed non è stato eseguito: il rischio residuo resta esplicito e la precedente accettazione non va descritta come prova di restore fisico.

## 5. Gate ancora aperti per Production

1. L'operatore deve configurare localmente `DATABASE_URL` con connessione PostgreSQL Direct o Session Pooler Production, ruolo `postgres` e privilegi DDL. Password e URI non devono essere incollate in chat, issue, PR o repository. Non resettare la password per aggirare il blocco.
2. Completare il piano operativo: operatore e approvatore nominati, finestra Europe/Rome, freeze schema, comunicazione agli utenti, criteri STOP, rollback/recovery e contatti.
3. Fissare commit e hash dei 19 SQL e ripetere il preflight read-only immediatamente prima del cutover.
4. Solo dopo tutti i gate e l'approvazione formale, eseguire il runner guarded dal checkout approvato.
5. Eseguire postflight (267 righe, 248 storiche intatte, 19 nuove esatte), smoke autenticato Production e comunicazione di chiusura.

## 6. Decisione

**QA applicativo: PASS per APP-01..APP-13 e APP-15.**  
**APP-14: PARTIAL. Production cutover: NO-GO.**

PR #57 resta aperta e non unita. Nessun merge, deploy, migrazione, scrittura ledger o modifica Production è stata eseguita in questa verifica. Non avviare il runner né dichiarare BETHAG pronto al lancio finché i gate sopra non risultano documentati e superati.

Questo documento aggiorna le evidenze al 2026-11-06; non sostituisce il runbook `docs/release/CUTOVER-BETHAG.md`, il freeze SQL o l'approvazione operativa.


## Addendum verifiche finali — 2026-11-06

Le evidenze seguenti aggiornano e prevalgono sui riferimenti ai run precedenti contenuti sopra:

- Commit candidato verificato: `4b4ea1a1448f188187441e79fcf1cc192b85a993`.
- Final QA APP-01..APP-15 [run 42204430131](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42204430131): **SUCCESS**. Tutti gli step sono completati con conclusion success, inclusi APP-12 (provider Resend), i flussi browser autenticati e APP-15 (role navigation/session persistence), oltre al teardown.
- Baseline Safety [run 42204430120](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42204430120): SUCCESS.
- Build/PostgreSQL bootstrap [run 42204430272](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42204430272): SUCCESS; rehearsal PostgreSQL 17, clean install 28 migrazioni, runner isolato 19 migrazioni, ACL/RLS e rollback checks superati.
- Preflight Production eseguito dall'operatore locale sul checkout esatto `4b4ea1a1448f188187441e79fcf1cc192b85a993`: **READ_ONLY_PRODUCTION_PREFLIGHT_PASS**. Connessione autenticata riuscita; 248/248 righe del ledger corrispondenti allo snapshot congelato; head `20261104222229_reconcile_production_acl_least_privilege`; 19 payload incrementali revisionati. Il runner dichiara esplicitamente che nessun body SQL è stato eseguito e nessuna riga del ledger è stata scritta.

### Stato aggiornato dei gate

- Collaudo applicativo QA APP-01..APP-15: **CHIUSO / PASS**.
- Preflight tecnico Production read-only: **CHIUSO / PASS**.
- Cutover Production: **ANCORA NO-GO**. Il preflight non applica migrazioni e non equivale ad approvazione del cutover.
- Restano da formalizzare: nominativo dell'operatore che eseguirà il cutover, nominativo dell'approvatore distinto, finestra di manutenzione in Europe/Rome, freeze schema/codice, comunicazione utenti, criteri STOP, piano di recovery e contatti; accettazione esplicita e riferita al piano esatto del rischio residuo di restore fisico provider-managed non testato; pin e approvazione formale del commit e dei 19 hash.

Nessuna migrazione è stata applicata. Nessun merge, deploy o modifica Production è stato eseguito. Non avviare il runner in modalità apply e non unire PR #57 fino alla chiusura documentata dei gate e all'approvazione esplicita del proprietario del progetto.


## Piano operativo candidato e ruoli — 2026-11-06

Il proprietario ha dichiarato esplicitamente: «tu lavori io approvo». Ruoli registrati nel runbook:
- Preparazione tecnica, revisione, checklist e guida: ChatGPT come assistente, non persona fisica né operatore autorizzato.
- Operatore umano che eseguirà i comandi locali: Federico Bartolucci.
- Approvatore/proprietario: Federico Bartolucci.
- Operatore e approvatore coincidono per scelta esplicita; non è una revisione indipendente a quattro occhi. Se è richiesto un controllo indipendente, serve una seconda persona e Production resta NO-GO fino alla nomina.

Il runbook `docs/release/CUTOVER-BETHAG.md` contiene ora il piano candidato con sequenza, criteri STOP, recovery, freeze, comunicazioni, backup/rischio residuo e matrice di approvazione.

**Restano non completati:** finestra Europe/Rome, freeze effettivo, avviso utenti (da approvare e inviare), verifica del backup corrente, contatti di escalation e approvazione finale del commit completo e dei 19 hash. Il commit applicativo `4b4ea1a1448f188187441e79fcf1cc192b85a993` ha superato QA/build/safety e il preflight read-only, ma il commit documentale è successivo; pertanto il candidato finale dovrà essere ripinnato, sottoposto a CI e preflight read-only nuovamente.

**Decisione invariata: Production NO-GO.** Nessun merge, deploy, apply o modifica Production è stato eseguito o autorizzato. La scelta dei ruoli non equivale all'approvazione finale del cutover.


### Preferenza finestra di manutenzione — 2026-11-06

Il proprietario preferisce eseguire il cutover di sabato in orario serale/notturno, per ridurre l'impatto sugli amministratori di condominio. Il runbook registra come fascia proposta **sabato 22:00 – domenica 02:00, Europe/Rome**. La data esatta e la fascia definitiva restano da concordare; non è stata prenotata né attivata alcuna finestra e nessun avviso utenti è stato inviato. L'orario di fine è un limite di pianificazione, non una promessa di riapertura: in caso di controlli incompleti o falliti, prevalgono i criteri STOP e l'app resta protetta.


---

## Addendum conclusivo QA e candidate refresh — 2026-11-06

Questo addendum prevale sui riferimenti a commit, run e finestre precedenti contenuti nelle sezioni storiche del documento.

### Commit e CI verificati
- Head PR #57 al controllo: `efe20d2e90f2ee725d756f958365b454de252759`.
- Final QA APP-01..APP-15 [run 42213933715](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933715): **SUCCESS**.
- Build [run 42213933748](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933748): **SUCCESS**.
- Baseline Safety [run 42213933711](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933711): **SUCCESS**.
- La CI include build, PostgreSQL 17, clean-install delle 28 migrazioni, rehearsal del runner sulle 19 migrazioni e test isolati ACL/RLS/rollback.
- APP-14 resta il gate Production preflight/postflight, non un test applicativo QA mancante.

### Gate runner aggiornato
Il runner Production richiede `BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED=YES` impostato localmente per questa specifica esecuzione se non è verificato un restore fisico provider-managed corrente. La vecchia accettazione storica nel manifest non è sufficiente da sola.

### Finestra obiettivo
**Sabato 7 novembre 2026, inizio ore 22:00, Europe/Rome.** Ora di fine non specificata. La finestra è un obiettivo operativo, non una prenotazione né un'autorizzazione al cutover.

### Stato release
- QA APP-01..APP-15: **CHIUSO / PASS** sullo SHA sopra.
- PR #57: aperta, non unita.
- Production: **NO-GO**.
- Nessuna migrazione, scrittura ledger, merge o deploy Production è stata eseguita.

### Gate ancora aperti
1. Revisione tecnica completa del diff PR (61 file; 260 commit al controllo corrente); non risultano review GitHub indipendenti registrate.
2. Preflight Production read-only sullo SHA finale esatto, dal checkout locale.
3. Evidenza di backup corrente oppure riconferma esplicita del rischio residuo di restore fisico non testato.
4. Contatti effettivi di escalation/recovery e piano STOP/rollback.
5. Approvazione finale esplicita del proprietario riferita allo SHA completo, ai 19 hash SQL, al backup/rischio, alla finestra e ai criteri STOP.

**Decisione invariata: Production NO-GO.** Nessun merge, deploy, apply o freeze operativo fino alla chiusura dei gate e all'approvazione finale.
