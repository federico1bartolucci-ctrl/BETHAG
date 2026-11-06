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

Il proprietario ha dichiarato: «tu lavori io approvo». Questa frase assegna la preparazione tecnica all'assistente e la decisione finale al proprietario; **non costituisce autorizzazione all'esecuzione del cutover Production**.
- Preparazione tecnica, revisione, checklist e guida: ChatGPT come assistente, non persona fisica né operatore autorizzato.
- Approvatore/proprietario: Federico Bartolucci; approvazione finale del cutover non ancora ricevuta.
- Operatore umano locale: da confermare esplicitamente. Federico potrà assumere anche questo ruolo solo se lo confermerà.
- Revisore indipendente: non nominato. La revisione del proprietario non equivale a una verifica indipendente a quattro occhi.

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


---

## Addendum di verifica sul candidato corrente — 2026-11-06

Questo addendum prevale sui precedenti riferimenti a SHA e run CI contenuti nelle sezioni storiche.

- **Head PR #57:** `b085473437b6f1a6c6e155b95443cdc504e4f04a`.
- **Build + PostgreSQL bootstrap:** [run 42215153881](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42215153881), SUCCESS.
- **Baseline Safety:** [run 42215153704](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42215153704), SUCCESS.
- **Final QA APP-01..APP-15:** [run 42215153918](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42215153918), SUCCESS.
- Tutti e tre i workflow si riferiscono allo SHA sopra. Il test negativo del runner conferma che l'assenza della riconferma locale del rischio residuo, quando manca prova di restore fisico corrente, blocca l'esecuzione prima della connessione PostgreSQL.
- La verifica live Production read-only precedentemente documentata resta riferita al ledger di 248 righe e head `20261104222229`; nessuna migrazione o scrittura Production è stata eseguita.

### Stato operativo aggiornato

- Collaudo QA APP-01..APP-15: **PASS** sul candidato corrente.
- Runner isolato e controlli di sicurezza CI: **PASS**.
- Revisione tecnica completa dei 61 file: **NON ANCORA CERTIFICATA**; la revisione eseguita finora è parziale e non equivale a una review indipendente registrata su GitHub.
- Restore fisico provider-managed corrente: **NON VERIFICATO**. Il rischio residuo richiede una decisione esplicita e attuale dell'approvatore; la vecchia accettazione non viene riutilizzata automaticamente.
- Contatti recovery/escalation e preflight locale sullo SHA corrente: **DA COMPLETARE**.
- Finestra obiettivo: **7 novembre 2026, ore 22:00, Europe/Rome**; ora di fine non specificata. Non è un'autorizzazione al cutover.

**Decisione: Production NO-GO.** PR #57 resta aperta e non unita. Nessun merge, deploy, freeze, invio di comunicazioni o apply Production è stato eseguito. L'eventuale superamento della finestra target non modifica i criteri STOP.


---

## Addendum finale di revisione e CI — 2026-11-06

**Commit applicativo testato:** `bc3c74a53eee8e7fd7c0d3ec67d6aa0074b46c02`.  
Il successivo commit `78101e12d107e47c0a53701088eb171b4da9cb00` aggiorna esclusivamente l'evidenza QA/documentazione; non modifica codice applicativo, runner o migrazioni.

### CI sul commit applicativo testato — tutti PASS
- Final QA APP-01..APP-15: [run 42222394817](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394817) — **SUCCESS**.
- Build + PostgreSQL bootstrap: [run 42222394795](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394795) — **SUCCESS**.
- Baseline Safety: [run 42222394790](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394790) — **SUCCESS**.
- Il bootstrap ha provato le 28 migrazioni clean-install, il runner guarded con 19 incrementi e il test negativo dei gate Production su checkout isolato.
- APP-12 ha verificato un invio sintetico Resend a `delivered@resend.dev`, callback firmato verso QA e persistenza dello stato `Consegnata`.

### Correzioni emerse dalla revisione
- Il readiness checker vincola le evidenze QA a uno SHA completo, controlla i risultati di ogni APP e rifiuta modifiche applicative/migrazioni successive al commit testato.
- La vecchia accettazione del rischio restore del 27 ottobre non è considerata sufficiente per un nuovo cutover: serve una riconferma locale riferita alla singola esecuzione o prova corrente di restore fisico.
- Il test APP-12 fallisce se il provider email non è configurato, invece di lasciare passare la CI con esito `PARTIAL`.
- Il runner Production richiede lo SHA approvato, verifica il checkout e rifiuta modifiche tracked o file untracked inattesi; il test negativo usa un worktree isolato.
- Corrette due guardie URL dei test PostgreSQL e la classificazione delle migrazioni QA-only (sezione C: 9, non 8).

### Stato effettivo
- QA APP-01..APP-15: **CHIUSO / PASS** sul commit applicativo `bc3c74a...`.
- Build, PostgreSQL bootstrap, Baseline Safety: **PASS** sullo stesso commit.
- PR #57: aperta, non unita; 61 file modificati. Non risulta una review indipendente registrata.
- Revisione semantica dell'intero diff: **ancora da completare/certificare**; i controlli eseguiti non equivalgono a una revisione indipendente.
- Production: **NO-GO**. Nessuna migrazione, scrittura ledger, merge o deploy eseguito.

### Gate Production ancora aperti
1. Concludere la revisione tecnica completa del diff.
2. Verificare backup corrente oppure riconfermare esplicitamente il rischio residuo di restore fisico non testato.
3. Inserire contatti reali di escalation/recovery e completare freeze, avviso utenti e piano STOP/rollback.
4. Ripetere il preflight Production read-only dal checkout finale pulito, con `BETHAG_EXPECTED_COMMIT_SHA` fissato allo SHA approvato.
5. Ottenere approvazione finale esplicita su SHA, 19 hash SQL, backup/rischio, finestra e criteri STOP.

La finestra obiettivo resta **sabato 7 novembre 2026, inizio ore 22:00 Europe/Rome**; ora di fine non specificata. Non equivale a freeze né ad autorizzazione al cutover.

**Decisione: Production NO-GO.** Nessun merge, deploy, apply, freeze o invio di comunicazioni è autorizzato da questo addendum.


---

## Addendum revisione tecnica del Portale — 2026-11-06

**Commit codice esaminato:** `c93447b5b35e9a897355a74c7b21330701c01452`.

Durante la revisione della migrazione `20261105050000_reconcile_portal_registration_upsert.sql` sono stati corretti tre difetti prima di qualsiasi cutover:

1. **Ambiguità workspace:** una richiesta senza corrispondenza anagrafica non viene più assegnata arbitrariamente quando il nome del condominio compare in workspace differenti. L'assegnazione avviene solo se esiste una sola corrispondenza nell'intero database; in caso contrario `workspace_id` resta NULL per la revisione amministrativa.
2. **Collegamento account già esistente:** la registrazione self-service e l'approvazione amministrativa rifiutano il tentativo di associare a un nuovo account un condòmino già collegato a un altro utente (`PORTAL_MEMBER_ALREADY_LINKED`).
3. **Ruoli staff:** la registrazione al Portale non degrada più un ruolo workspace `admin`/`collaborator` né il corrispondente ruolo profilo a `resident`.

Il test PostgreSQL 17 isolato è stato esteso per verificare i tre casi, mantenendo i dati sintetici in rollback. Il draft e la migrazione canonica sono byte-identici; l'hash Git blob della migrazione è stato aggiornato nel manifest congelato. Nessuna migrazione è stata applicata a QA o Production.

### CI e stato del candidato

- Le esecuzioni verdi precedenti (Final QA, Baseline Safety e Build/PostgreSQL) sono riferite al commit precedente `3b6920bbb10a625a36c8010f594a98f61cc729e7`; **non certificano le nuove correzioni SQL e i test aggiunti successivamente**.
- Il Build sul commit precedente ha avuto un primo tentativo fallito nel login browser dell'amministratore; il rerun dello stesso job è poi passato. Per evitare contesa dei refresh token tra account QA condivisi, il workflow Build ora usa lo stesso gruppo di concurrency del collaudo finale.
- **Nuova CI sul candidato aggiornato: DA ESEGUIRE / NON ANCORA CERTIFICATA.**
- Il preflight Production read-only deve essere ripetuto sul commit finale esatto dopo il superamento della nuova CI.
- PR #57 resta aperta e non unita. Nessuna scrittura, migrazione, merge o deploy Production è stata eseguita.

**Decisione invariata: Production NO-GO.** La finestra obiettivo del 7 novembre alle 22:00 Europe/Rome non supera né sostituisce i gate tecnici e operativi.


---

## Addendum successivo — candidato verificato 2026-11-06

Questo addendum prevale sugli stati CI precedenti e sull'addendum di revisione che indicava la nuova CI ancora da eseguire.

### Candidato applicativo e CI esatta

**SHA applicativo/SQL testato:** `db8ed14955174ff92ad2df5567c2b4e3153219a2`.

- Final QA APP-01..APP-15: [run 42225387307](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42225387307) — **SUCCESS**.
- Build + PostgreSQL 17 bootstrap: [run 42225387494](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42225387494) — **SUCCESS**.
- Baseline Safety: [run 42225387294](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42225387294) — **SUCCESS**.
- Il bootstrap ha superato le 28 migrazioni clean-install, il rehearsal delle 19 migrazioni canoniche, il runner guarded, gli ACL/default ACL, il rollback subentro e il test dedicato alla registrazione Portale.
- Il test Portale ha superato i casi aggiunti: nomi condominiali ambigui tra workspace, rifiuto del takeover di un membro già collegato a un altro account e conservazione dei ruoli admin/collaborator.
- APP-12 provider Resend, flussi browser autenticati e APP-15 per amministratore, collaboratore e condomino: **PASS**.
- Diagnostica APP-15: artifact `bethag-app15-diagnostics`, ID `13505238133`.

### Correzione SQL finale

Il rehearsal ha intercettato l'uso non supportato di `min(uuid)` nella risoluzione del workspace. È stato sostituito con `array_agg(...)[1]`, applicato sia alla risoluzione del condominio sia al fallback del workspace unico. Draft e migrazione canonica sono nuovamente byte-identici e l'hash è stato ripinnato nel manifest congelato. Il test PostgreSQL 17 sul candidato sopra è **PASS**.

### Verifica live Production — sola lettura

Il preflight SQL read-only della release è stato eseguito sul progetto Production `tctcgptrsmvgajqjgnev` tramite Supabase, senza scritture:
- PostgreSQL 17.6; ledger **248 righe**, head `20261104222229_reconcile_production_acl_least_privilege`;
- inventario di 47 relazioni pubbliche conforme;
- zero privilegi MAINTAIN effettivi per authenticated e service_role;
- zero privilegi diretti sulle tabelle pubbliche per anon;
- Security Advisor: zero lint; Health Advisor: zero lint;
- stato schema atteso prima del cutover confermato: `workspace_members.data`, trigger co-proprietari e helper upsert Portale ancora assenti; correzioni collaboratore non ancora applicate.

Il preflight SQL non ha modificato schema, dati, ACL o ledger. Il preflight locale del runner guarded, con SHA finale e hash SQL congelati, resta un gate distinto da eseguire prima dell'apply.

### Stato decisionale

- Revisione interna dei 61 file della PR: completata con le correzioni sopra; non risulta una review indipendente registrata su GitHub.
- QA APP-01..APP-13 e APP-15: **CHIUSO / PASS** sullo SHA esatto.
- APP-14: **PARTIAL**, perché include il cutover e lo smoke Production.
- Production: **NO-GO**. Ledger invariato a 248 righe; nessuna migrazione, scrittura ledger, merge o deploy eseguito.

Restano obbligatori: preflight locale del runner sul checkout finale pulito; backup fisico corrente oppure riconferma esplicita e specifica del rischio residuo di restore non testato; contatti recovery/escalation; freeze e comunicazione agli utenti; criteri STOP/rollback; approvazione finale su SHA, 19 hash e finestra; apply controllato, postflight e smoke autenticato Production.

La finestra obiettivo resta **sabato 7 novembre 2026, ore 22:00 Europe/Rome**. Non costituisce autorizzazione automatica al cutover.


---

## Addendum CI e allineamento evidenze — 2026-11-06

**Commit verificato:** `90f7b110c81b70b95b24225862073bd45d75b564`.

I tre workflow GitHub Actions sono stati verificati sul medesimo SHA e risultano tutti completati con esito SUCCESS:

- Final QA APP-01..APP-15: run [42240333748](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42240333748).
- Build + PostgreSQL 17 bootstrap: run [42240333486](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42240333486).
- Baseline Safety: run [42240334475](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42240334475).

Il file `supabase/rebuild/qa-final-collaudo-20261105.json` è stato riallineato allo SHA e agli ID delle tre run. L'evidenza distingue APP-01..APP-13 e APP-15, superati in QA, da APP-14, che resta il gate Production post-cutover.

La PR #57 contiene **63 file modificati** al momento di questo addendum. Il precedente riferimento a 61 file è superato.

La modifica di concorrenza Build è inclusa nel commit verificato. La Build non è stata considerata superata sulla base del solo avvio: è stata verificata la conclusione SUCCESS dell'intera run, compresi i job previsti.

**Decisione invariata: Production NO-GO.** Nessun merge, deploy, freeze o apply Production è stato eseguito. La revisione semantica completa dei 63 file resta in corso; l'allineamento dell'evidenza QA non equivale alla sua certificazione.


---

## Addendum finale — collaudo e controllo autorizzazioni, 2026-11-06

Questo addendum prevale sugli stati CI precedenti e sui riferimenti storici a commit/file count superati.

### Commit applicativo/SQL collaudato

**SHA:** `ea32fc492757e5165b41580f082e42916bd54a8c`.

- Final QA APP-01..APP-15: [run 42246244137](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246244137) — **SUCCESS**.
- Build + PostgreSQL 17 bootstrap: [run 42246243987](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243987) — **SUCCESS**.
- Baseline Safety: [run 42246243967](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243967) — **SUCCESS**.
- Build: 28 migrazioni clean-install; rehearsal PostgreSQL 17 delle 19 migrazioni canoniche con runner guarded; preflight e postflight isolati; ACL/default ACL; rollback subentro; browser smoke.
- QA: APP-01..APP-13 e APP-15 **PASS**. APP-14 resta il gate Production post-cutover e non può essere dichiarato PASS prima dell'esecuzione controllata e delle verifiche live.
- Il test PostgreSQL del Portale verifica richieste con nomi condominiali ambigui, RLS limitata ai gestori dei condomìni attivi corrispondenti, account e-mail verificato, corrispondenza tra e-mail account/richiesta/condòmino, blocco del takeover e conservazione dei ruoli staff.

Il file `supabase/rebuild/qa-final-collaudo-20261105.json` è stato ripinnato allo SHA e agli ID delle tre run sopra.

### Revisione PR

- PR #57: **65 file modificati**, aperta e non unita.
- La revisione tecnica interna è stata aggiornata sulle correzioni di readiness, runner, RLS e registrazione Portale.
- Non risulta alcuna review GitHub indipendente registrata. La revisione del proprietario è valida come approvazione del proprietario, ma non equivale a un controllo indipendente a quattro occhi.

### Autorizzazione e decisione Production

La registrazione di autorizzazione nel manifest è stata corretta: `user_authorization.status = NOT_RECEIVED` e stato del freeze `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`.

L'istruzione «tu lavori io approvo» individua Federico come approvatore/proprietario; non costituisce approvazione finale del cutover né autorizzazione a merge, deploy, freeze o apply. L'operatore umano locale resta da confermare. La finestra obiettivo del 7 novembre 2026 alle 22:00 Europe/Rome non equivale ad autorizzazione.

**Production: NO-GO.** Nessuna migrazione, scrittura ledger, merge, deploy, freeze o altra modifica Production è stata eseguita. Restano necessari: preflight read-only e preflight locale sul checkout documentale finale, backup fisico corrente oppure riconferma esplicita del rischio residuo, contatti recovery, operatore confermato, avviso utenti approvato, criteri STOP/rollback e approvazione finale scritta su SHA, 19 hash SQL e finestra. APP-14 sarà verificato solo dopo il cutover autorizzato.
