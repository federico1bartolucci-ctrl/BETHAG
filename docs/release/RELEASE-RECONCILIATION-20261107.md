# BETHAG — release reconciliation addendum

**Data:** 2026-11-07  
**PR:** #57 — `fix/qa-view-acl-parity-20261105` → `main`  
**Scopo:** riallineamento documentale e operativo dopo il completamento del collaudo QA.

## 1. Source of truth e candidato verificato

- Ultimo commit applicativo sottoposto a verifica: `a5be3e1dfb8f43d7f7a4e8ff4bc10c87b3fc1f3e`.
- La branch PR #57 risultava a questo SHA al momento della verifica.
- La documentazione storica che riporta SHA precedenti resta conservata come evidenza storica, ma non costituisce approvazione per il candidato corrente.
- L'aggiornamento di questo addendum genera un nuovo commit documentale. Di conseguenza, **lo SHA risultante dovrà essere nuovamente verificato con CI e diventerà il solo candidato valutabile per l'approvazione finale**. Non si riutilizzano approvazioni riferite a SHA precedenti.

## 2. CI e collaudo QA sul candidato applicativo precedente

Sul source SHA `a5be3e1dfb8f43d7f7a4e8ff4bc10c87b3fc1f3e` risultano completati con successo:

- Final QA APP-01..APP-15: run [42335679462](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679462), job `final-qa-collaudo`, attempt finale SUCCESS, nessuno step fallito o saltato.
- Build: run [42335679466](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679466), SUCCESS.
- Baseline Safety: run [42335679476](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679476), SUCCESS.

Il primo tentativo Final QA ha avuto un errore transitorio Cloudflare 521 durante cleanup; il job è stato rilanciato e l'ultimo attempt è SUCCESS. Fa fede l'ultimo attempt, non il fallimento transitorio precedente.

APP-12: i test QA/provider documentati confermano invio di messaggi sintetici di test e ricezione degli eventi provider per il destinatario di test. Non è una certificazione di deliverability di massa o di tutti i template Production, né prova di invii a condomini reali.

APP-14: resta **PARTIAL / POST-CUTOVER**. Il collaudo applicativo QA è completato, ma la verifica ACL/schema sul database Production dopo l'applicazione delle migrazioni non può essere dichiarata PASS prima del cutover e del postflight. Non confondere PASS QA con parità Production.

## 3. Migrazioni: congelamento immutato

Il file `supabase/rebuild/production-migration-cutover-freeze-20261105.json` resta l'artefatto congelato della sequenza di 19 migrazioni e dei rispettivi Git blob SHA. Non modificarne l'ordine, i payload o gli hash per risolvere discrepanze documentali.

La verifica read-only Production più recente disponibile in questa sessione ha rilevato:
- database PostgreSQL 17.6;
- ledger: 248 righe;
- head: `20261104222229`;
- Security Advisor: zero lint;
- Health Advisor: zero lint.

Il target post-cutover resta 267 righe: 248 storiche intatte + 19 nuove righe esatte. La verifica live del ledger non dimostra che le 19 migrazioni siano state applicate: **non sono state applicate**.

## 4. Approvazioni e finestra: invalidazione esplicita

La precedente approvazione finale registrata nel testo PR era riferita allo SHA `b029d991c396a5b1fccbbf9b71c0685ddb72a721`, non al candidato `a5be3e1...` e non al nuovo commit documentale che verrà generato da questo addendum.

Pertanto:
- la precedente approvazione è **non valida per qualsiasi esecuzione sul candidato attuale**;
- la finestra precedentemente indicata 7 novembre 2026, 22:00–8 novembre 2026, 02:00 Europe/Rome è da considerarsi scaduta/da riconfermare prima di un eventuale cutover;
- l'eventuale approvazione successiva dovrà indicare il nuovo SHA completo, i 19 hash ordinati, il rischio residuo backup, l'operatore, la finestra e i criteri STOP/recovery.

## 5. Stato ambienti e divieti

- Production Supabase `tctcgptrsmvgajqjgnev`: nessuna modifica eseguita in questa attività.
- Nessun merge della PR #57.
- Nessun deploy.
- Nessuna migrazione Production applicata.
- Nessuna modifica al ledger Production.
- Nessun freeze operativo attivato.
- Restore fisico provider-managed non testato; il restore logico locale verificato non deve essere descritto come restore fisico.

## 6. Gate residui

1. Attendere il nuovo SHA prodotto dal commit documentale e verificare CI completa su quel preciso candidato.
2. Verificare che il freeze dei 19 payload SQL e i rispettivi blob SHA siano ancora identici al candidato.
3. Eseguire preflight Production esclusivamente read-only, incluso controllo aggiornato di ledger, ACL, RLS, ruoli/default privileges e configurazione effettiva Data API nella Dashboard.
4. Riconfermare connessione PostgreSQL diretta/Session Pooler, operatore, finestra e piano STOP/recovery.
5. Ottenere nuova approvazione scritta del proprietario riferita allo SHA finale e ai 19 hash.
6. Solo dopo tutti i gate, valutare separatamente merge, deploy e cutover. Ogni azione resta subordinata alla sua specifica autorizzazione.
7. Dopo l'applicazione: postflight, 267 righe con storico invariato, ACL/RLS, smoke autenticati Production e chiusura APP-14.

## Decisione

**QA applicativo sul candidato `a5be3e1...`: PASS.**  
**Documentazione storica: conservata, ma superata da questo addendum per lo stato corrente.**  
**Production cutover: NO-GO fino alla nuova certificazione sullo SHA documentale finale, al preflight aggiornato e a una nuova approvazione esplicita.**

Questo addendum è la fonte di verità per lo stato di rilascio dal momento del suo commit. Non autorizza modifiche a Production.


## 7. Manifest approval guard — riallineamento completato

Dopo la prima stesura di questo addendum, il manifest congelato è stato aggiornato esclusivamente nei metadati di approvazione:
- `status` impostato a `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`;
- precedente autorizzazione storica conservata nell’addendum documentale, non nel payload congelato del manifest;
- `user_authorization` corrente impostata a `PENDING`, senza SHA approvato, approvatore, timestamp o hash approvati;
- sequenza, ordine e tutti i 19 `git_blob_sha` SQL lasciati invariati.

Questo riallineamento è necessario anche come salvaguardia eseguibile: il runner guarded non può interpretare la vecchia autorizzazione come consenso valido per il candidato attuale. La nuova approvazione dovrà essere registrata nel manifest soltanto dopo il completamento dei gate sullo SHA finale.


## 8. Aggiornamento evidenze — 2026-11-07, ore 04:20 UTC

Questo paragrafo integra e, per gli esiti CI qui indicati, prevale sulle sezioni precedenti che riportano candidati SHA anteriori.

### Candidato e workflow sullo SHA esatto

- SHA verificato: `ed6ff431421f8c62bd9ec8ea7b56db72a57b3f0a`.
- Final QA APP-01..APP-15: [run 42337313192](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42337313192), attempt 2, `completed / success`; job `final-qa-collaudo` concluso SUCCESS.
- Build: [run 42337313106](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42337313106), `completed / success`.
- Baseline Safety: [run 42337313117](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42337313117), `completed / success`.
- I tre workflow riportano lo stesso head SHA completo.

Nel primo attempt del Final QA, i test browser si erano arrestati per risposte Cloudflare 521/CORS dall'host Supabase QA. Il secondo attempt è stato eseguito sullo stesso SHA e tutti gli step sono terminati SUCCESS, inclusi flussi browser autenticati e APP-15. Il primo errore è quindi registrato come incidente transitorio di disponibilità QA, non come difetto applicativo dimostrato.

### Limiti delle evidenze

- APP-12 ha superato il probe provider Resend con destinatario sintetico di test; non certifica deliverability reale su larga scala o tutti i template Production.
- APP-14 resta **PARTIAL / POST-CUTOVER**: non sono stati eseguiti postflight ACL/schema né smoke autenticati su Production.
- La review GitHub indipendente non risulta registrata. Il manifest registra però la decisione del proprietario del 2026-11-06 di accettare la revisione tecnica interna come controllo di progetto, dichiarando esplicitamente che non è una revisione a quattro occhi e che l'assenza di un revisore indipendente non è bloccante per il rilascio. Il rischio di revisione a singolo soggetto resta trasparente e accettato.
- Il restore fisico provider-managed resta non testato; il restore logico locale non è equivalente.
- Il manifest mantiene l'approvazione corrente PENDING e nessuno SHA approvato; la protezione exact-SHA resta attiva.

### Stato operativo invariato

PR #57 resta OPEN e NOT MERGED. Nessun merge, deploy, freeze operativo, apply di migrazioni o modifica Production è stato eseguito. Il ledger Production e i payload congelati non sono stati modificati da questa verifica.

### Gate residui

1. Verificare l'integrità dei 19 payload/hash sul candidato finale.
2. Eseguire il preflight diretto del runner da checkout pulito e le verifiche Production read-only immediatamente pre-cutover.
3. Riconfermare operatore, finestra, recovery/STOP e rischio residuo backup.
4. Ottenere approvazione scritta riferita allo SHA finale e ai 19 hash ordinati.
5. Solo dopo, valutare separatamente merge, deploy e cutover; APP-14 si chiude esclusivamente con postflight e smoke autenticati Production.

La review indipendente resta non disponibile/non registrata; il proprietario ha accettato la revisione interna come controllo di progetto non indipendente. Non è un gate bloccante secondo il manifest e non deve essere descritta come review indipendente.

**Esito aggiornato:** Build, Baseline Safety e Final QA APP-01..APP-15 PASS sullo SHA `ed6ff431...`; **Production resta NO-GO**.


## 9. Riconciliazione conclusiva del candidato — 2026-11-07

Questa sezione prevale sulle sezioni precedenti di questo documento e sugli addenda storici che riportano SHA candidati anteriori.

### Candidato e CI verificati

- Candidato verificato: `ed6ff431421f8c62bd9ec8ea7b56db72a57b3f0a`.
- Final QA APP-01..APP-15: [run 42338407965](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42338407965) — SUCCESS; tutti gli step del job `final-qa-collaudo` conclusi con SUCCESS, inclusi i flussi browser autenticati e APP-15.
- Build e PostgreSQL bootstrap 17: [run 42338407967](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42338407967) — entrambi i job SUCCESS. Rehearsal clean-install delle 28 migrazioni e runner guarded con 19 migrazioni canoniche su database isolati: SUCCESS.
- Baseline Safety: [run 42338407961](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42338407961) — SUCCESS.
- Verifica dei payload SQL sul candidato: 19/19 Git blob SHA corrispondenti ai valori congelati nel manifest; nessun payload, ordine o hash è stato modificato.

### Revisione e rischio residuo

- Nessuna review GitHub indipendente è registrata.
- Il manifest conserva la decisione del proprietario del 2026-11-06: revisione interna accettata come controllo di progetto, non indipendente, con rischio single-reviewer dichiarato e accettato. Il manifest indica espressamente che questo limite non è bloccante per il rilascio.
- Il restore fisico provider-managed non è stato eseguito. Il rischio residuo resta accettato secondo il manifest; il restore logico locale verificato non equivale a un restore fisico.
- APP-12 ha superato il probe provider con destinatario sintetico Resend; non costituisce certificazione della deliverability reale verso tutti i destinatari Production.
- APP-14 resta PARTIAL / POST-CUTOVER fino a postflight ACL/schema e smoke autenticati sul database Production.

### Stato GitHub e autorizzazione

- PR #57: OPEN, NOT MERGED; head `ed6ff431421f8c62bd9ec8ea7b56db72a57b3f0a`, base `main` (`51157c1e475de9379cab4aea2cf38c039a9c4bab`).
- Il manifest mantiene `user_authorization.status = PENDING`, senza SHA approvato e senza hash approvati. La precedente autorizzazione riferita a un diverso SHA resta superseded e non è riutilizzabile.
- Nessun merge, deploy, freeze operativo, DDL/DML, applicazione di migrazioni o scrittura del ledger Production è stato eseguito.

### Effetto di questo aggiornamento documentale

La presente modifica corregge esclusivamente la riconciliazione documentale. Non modifica codice applicativo, workflow, manifest, migrazioni SQL o relativi hash. Il commit generato da questo aggiornamento documentale sarà un nuovo SHA: prima di considerarlo candidato finale dovrà superare nuovamente i workflow CI previsti sullo SHA esatto. Le evidenze verdi sopra restano riferite al commit `ed6ff431...`, non al futuro commit documentale.

**Decisione:** QA sul candidato `ed6ff431...` PASS; Production resta **NO-GO** fino al completamento dei gate pre-cutover e alla nuova approvazione esatta.


## 10. Stato consolidato — head f38f894 e preflight Production del 2026-11-07

Questa sezione è l'aggiornamento più recente e prevale sulle sezioni 1–9 per quanto riguarda candidato GitHub, CI e preflight Production.

### Head GitHub e CI sullo SHA esatto

- PR #57: OPEN, NOT MERGED; branch `fix/qa-view-acl-parity-20261105` → `main`.
- Head effettivo verificato via GitHub: `f38f89424acfbd76771be8983f71807b1a25a91a`.
- Base SHA rilevato: `51157c1e475de9379cab4aea2cf38c039a9c4bab`.
- Il commit `f38f894...` modifica questo solo documento rispetto al parent `ed6ff431421f8c62bd9ec8ea7b56db72a57b3f0a`; nessuna modifica a codice, SQL, manifest o workflow.
- Final QA APP-01..APP-15: [run 42339282179](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42339282179) — SUCCESS.
- Build: [run 42339282090](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42339282090) — SUCCESS.
- Baseline Safety: [run 42339282082](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42339282082) — SUCCESS.
- Le tre run sono riferite allo SHA `f38f894...`. I precedenti SHA e run restano evidenze storiche e non sono il candidato corrente.

### Preflight Production read-only — Supabase `tctcgptrsmvgajqjgnev`

Verifiche eseguite senza scritture:

- PostgreSQL 17.6; ledger `supabase_migrations.schema_migrations`: 248 righe, head `20261104222229`.
- Ledger live confrontato con `supabase/rebuild/production-ledger-20261105.json`: 248/248 version/name corrispondenti.
- Le 19 migrazioni canoniche del cutover risultano tutte assenti dal ledger; target post-cutover previsto 267 righe. Nessuna migrazione è stata applicata.
- 47 tabelle e 1 view in `public`; RLS attiva su 47/47 tabelle.
- Security Advisor: zero lint; Health Advisor: zero lint.
- Privilegi effettivi: anon senza SELECT/INSERT/UPDATE/DELETE sulle relazioni public; authenticated senza MAINTAIN; service_role senza MAINTAIN.
- Due routine pubbliche SECURITY INVOKER, `normalize_zero_ownership_owner()` e `preserve_closing_condominium_member_history()`, risultano ancora eseguibili via PUBLIC. La migrazione canonica prevista deve revocare l'accesso diretto ai client preservando il servizio autorizzato.
- `workspace_members.data` non è ancora presente; la migrazione target prevista lo introduce.
- È emersa una differenza da documentare/riconciliare tra il dato storico del manifest sui default ACL e la query live attuale: il live non mostra default CRUD anon sulle nuove tabelle. Nessun GRANT/REVOKE è stato eseguito.
- Performance Advisor: 60 INFO `unused_index`, 21 WARN `multiple_permissive_policies`, 1 INFO `auth_db_connections_absolute`. Sono avvisi performance, non Security Advisor lint; non sono stati modificati indici o policy.

### Limiti ancora aperti del preflight

1. **Dashboard Data API exposure:** non verificata direttamente nella Dashboard Supabase. Le query SQL non sono prova sufficiente della lista di schemi esposti dalla Data API. Prima del cutover l'operatore deve acquisire evidenza della configurazione effettiva; verificare in particolare che `private` non sia esposto e che gli schemi pubblici siano quelli intenzionali.
2. **Connessione PostgreSQL diretta/Session Pooler:** non verificata dal runner guarded in un checkout pulito. Occorre prova di connessione e preflight runner senza applicare migrazioni.
3. **Default ACL:** mismatch tra snapshot storico del manifest e stato live attuale da riconciliare esplicitamente con query e motivazione, senza modifiche ai privilegi in questa fase.
4. Finestra, operatore e piano recovery/STOP devono essere riconfermati. Il restore fisico provider-managed non è testato; il restore logico locale non lo sostituisce.

### Approvazione e divieti

- Manifest: `user_authorization.status = PENDING`, `approved_commit_sha = null`, `approved_migration_hashes = []`.
- Nessuna approvazione precedente è riutilizzabile per un nuovo SHA.
- Nessun merge, deploy, freeze operativo, DDL/DML, GRANT/REVOKE, migrazione o modifica Production è stato eseguito.
- Il PASS CI sullo SHA `f38f894...` non equivale ad autorizzazione al cutover.

**Decisione aggiornata:** CI sullo SHA `f38f894...` PASS; preflight Production **parzialmente completato**; fase 3 **NON CHIUSA** finché i tre controlli residui (Data API Dashboard, connessione diretta/Session Pooler, riconciliazione default ACL) non dispongono di evidenza verificabile. Production resta **NO-GO**.


## 11. Chiarimento default ACL — query catalogo Production del 2026-11-07

La query diretta su `pg_default_acl` in Production ha permesso di precisare la discrepanza descritta nella sezione 10:

- Per oggetti `public` creati dal ruolo `postgres`: default table ACL con privilegi completi al solo `postgres`; `service_role` riceve solo `REFERENCES, TRIGGER, TRUNCATE`. Non risultano default table CRUD per `anon` o `authenticated` sotto il ruolo owner `postgres`.
- Per oggetti `public` creati dal ruolo provider-managed `supabase_admin`: i default ACL comprendono CRUD e privilegi aggiuntivi per `anon`, `authenticated`, `service_role` e `postgres`; le sequence default ACL includono SELECT/UPDATE/USAGE per tali ruoli.
- Il manifest conserva `postgres_default_anon_crud = true`, ma la query live colloca i default ACL anon ampi sotto owner `supabase_admin`, non sotto owner `postgres`. Il manifest descrive inoltre separatamente `supabase_admin_defaults_untouched = true` e la disposition provider-managed. La differenza è quindi soprattutto di etichettatura/semantica del campo e di distinzione tra owner, non prova di un GRANT anon aggiuntivo effettuato dall'applicazione.
- Il manifest dichiara i default ACL `supabase_admin` provider-managed e non modificabili dal ruolo postgres; il riferimento documentale Supabase è registrato nel manifest. Non tentare di correggerli con GRANT/REVOKE né alterare il baseline provider-managed.
- Il requisito applicativo va quindi valutato sul ruolo effettivo che crea le nuove tabelle. Per il runner/cutover controllato, il punto verificabile è che gli oggetti applicativi siano creati dal ruolo previsto e che le default ACL applicabili a quel ruolo siano quelle attese dalla migrazione canonica. La query conferma l'assenza di default anon CRUD per owner `postgres`, ma non autorizza a ignorare le ACL provider-managed di `supabase_admin`.

**Esito del controllo default ACL:** chiarita la causa della discrepanza e confermata la necessità di mantenere intatti i default provider-managed; nessuna modifica ai privilegi eseguita. Questo controllo catalogo può considerarsi documentato, fermo restando il controllo sul ruolo effettivo usato dal runner nella prova diretta.


## 12. Evidenza Dashboard Data API Production — 2026-11-07

Evidenza acquisita tramite screenshot della Dashboard Supabase fornito dal proprietario del progetto durante la verifica della fase 3. La barra URL identifica il progetto Production `tctcgptrsmvgajqjgnev` e la pagina Integrations → Data API → Settings.

Configurazione visibile:
- Schemi esposti: 2 di 3.
- `public`: selezionato/esposto.
- `graphql_public`: selezionato/esposto.
- `private`: non selezionato/non esposto.
- `Automatically expose new tables`: interruttore disattivato.
- Extra search path visibile: `public`, `extensions`.

**Esito:** il gate di verifica della Data API exposure è PASS sulla base dell'evidenza Dashboard fornita il 2026-11-07. La configurazione rispetta il requisito che lo schema `private` non sia esposto. Lo screenshot è conservato nella conversazione di progetto; non è stato modificato alcun setting.

Restano aperti: prova della connessione PostgreSQL diretta/Session Pooler e preflight guarded runner da checkout pulito senza apply, con conferma del ruolo DB effettivo; riconferma operatore/finestra/piano STOP-recovery. Nessuna operazione Production è stata eseguita.


## 13. Contratto esplicito dei campi modificabili del manifest — 2026-11-07

Il confronto strutturato tra il manifest sullo SHA QA certificato `a5be3e1dfb8f43d7f7a4e8ff4bc10c87b3fc1f3e` e quello sul precedente head documentale `54990b44dcdf9d1430bf5636314623a576f89ab4` ha rilevato 13 differenze a livello di percorso JSON.

La riconciliazione ha confermato:
- `sequence`: 19/19 elementi identici, inclusi ordine, nome file, stato e Git blob SHA;
- `live_ledger`: snapshot identico, 248 righe, head `20261104222229`;
- `expected_postflight`: identico;
- nessuna variazione dei payload SQL o dei relativi hash.

### Campi ammessi a variare dopo la certificazione QA

Il contratto eseguibile in `scripts/lib/release-readiness-utils.mjs` ammette esclusivamente questi quattro campi di primo livello:
- `status`;
- `safety`;
- `user_authorization`;
- `review_disposition`.

Questi campi descrivono stato e decisioni di revisione/autorizzazione. La modifica di `user_authorization` non rende valida un'approvazione: il runner richiede comunque stato `RECEIVED`, SHA sorgente esatto, SHA di esecuzione approvato separatamente e corrispondenza puntuale di tutti i 19 hash ordinati.

### Campi non ammessi

`superseded_user_authorization` e `current_release_reconciliation` non sono stati aggiunti all'allowlist. Sono sezioni storiche/di riconciliazione aggiunte dopo la QA e non devono essere trattate come metadati liberamente modificabili. La prima autorizzazione storica è conservata in questo documento come evidenza, mentre lo stato corrente del manifest resta `user_authorization.status = PENDING`.

Ogni nuova chiave di primo livello non prevista dal contratto resta parte del payload congelato e provoca il blocco del confronto, salvo una modifica esplicita e testata del contratto stesso. Non sono introdotte eccezioni generiche per “metadati documentali”.

### Correzione applicata

Il manifest è stato ricostruito a partire dalla versione presente sullo SHA QA certificato, mantenendo esclusivamente i cambiamenti ammessi a `status` e `user_authorization`. Le due sezioni aggiunte successivamente sono state rimosse dal manifest; la loro funzione documentale è assolta da questo addendum. Sequenza 19 migrazioni, hash, snapshot 248 righe e postflight sono preservati.

Il test unitario è stato rafforzato per dimostrare che l'aggiunta di `superseded_user_authorization` o `current_release_reconciliation` cambia il payload congelato e quindi non viene ignorata dal runner.

Questa correzione non approva alcun SHA, non autorizza il cutover e non modifica Production. Il nuovo commit deve superare CI sullo SHA esatto prima di ogni ulteriore preflight.

## 14. Riconciliazione dopo Final QA — head 553ee1f — 2026-11-07

Questa sezione registra le verifiche successive alla sezione 13. Non modifica il manifest, lo snapshot Production, i payload SQL, gli hash o gli ambienti.

### CI sullo SHA esatto

Head PR #57 verificato via GitHub: `553ee1fd017566bb80d137f3e9b91135745e627a`.

- Final QA APP-01..APP-15: run [42343070828](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42343070828), attempt 2 — SUCCESS; tutti gli step, inclusi i flussi browser autenticati e APP-15, risultano completati con SUCCESS.
- Build: run [42343070801](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42343070801) — SUCCESS.
- Baseline Safety: run [42343070748](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42343070748) — SUCCESS.
- Le tre run risultano associate allo stesso head SHA completo `553ee1fd017566bb80d137f3e9b91135745e627a`.

### Integrità del congelamento

Verifica del Git tree sullo SHA `553ee1f...` contro i 19 `git_blob_sha` del manifest:

- Migrazioni canoniche: **19/19 hash coincidenti**.
- Sequenza e ordine: 19 elementi, invariati.
- Stato di tutte le 19 migrazioni: `PENDING_NOT_APPLIED`.
- Manifest: `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`.
- `user_authorization.status = PENDING`; `approved_commit_sha = null`; `approved_migration_hashes = []`.
- Snapshot `production-ledger-20261105.json` e manifest freeze sono presenti nel medesimo tree; nessun aggiornamento del loro contenuto è stato effettuato in questa attività.

Verifica live Production esclusivamente read-only:

- Ledger live: **248 righe**; head `20261104222229_reconcile_production_acl_least_privilege`.
- Confronto ordinato con `production-ledger-20261105.json`: **248/248 coppie versione/nome identiche**, nessuna riga mancante o aggiuntiva.
- Le 19 versioni canoniche in attesa risultano assenti dal ledger.
- Le asserzioni read-only eseguite su inventario relazioni, privilegi MAINTAIN, privilegi diretti anon, default MAINTAIN del ruolo postgres, default provider-managed `supabase_admin`, routine PUBLIC EXECUTE, wrapper SECURITY INVOKER, colonna `workspace_members.data` e stato ACL helper trasferimento sono terminate senza eccezioni.
- L'esecuzione di queste query non ha prodotto DDL, DML, GRANT/REVOKE o scritture al ledger.

**Limite della verifica:** il blocco read-only eseguito tramite connettore non equivale all'esecuzione integrale dello script preflight ufficiale tramite runner guarded da checkout pulito e connessione PostgreSQL diretta/Session Pooler. Non viene dichiarato quel gate come superato.

### Gate ancora aperti per chiudere la fase 3

1. Eseguire da checkout pulito sullo SHA finale il runner/preflight guarded in modalità senza apply, usando la connessione PostgreSQL diretta o Session Pooler; acquisire evidenza del ruolo DB effettivo e del risultato integrale del runner. Il connettore Supabase disponibile in questa sessione espone il progetto Production per query SQL, ma non fornisce la prova della connessione diretta del runner.
2. Riconfermare operatore umano, finestra completa (inizio e fine) e piano STOP/recovery. La precedente indicazione della sola ora di inizio non definisce una finestra operativa completa.
3. Mantenere la nuova approvazione del proprietario in stato PENDING fino alla chiusura dei gate; nessuno SHA e nessun hash sono approvati da questa verifica.

La configurazione Data API Production resta documentata come verificata da screenshot Dashboard nella sezione 12. Il rischio di restore fisico provider-managed resta non testato e accettato come rischio residuo secondo la decisione già registrata; non deve essere descritto come restore fisico eseguito.

### Stato decisionale

- CI e collaudo automatico sullo SHA `553ee1f...`: **PASS**.
- Integrità 19 migrazioni: **PASS, 19/19**.
- Ledger Production: **PASS, 248/248**.
- Preflight read-only via connettore: **PASS per le asserzioni eseguite; non sostituisce il runner guarded integrale**.
- Runner guarded da checkout pulito/connessione diretta: **PENDING**.
- Operatore/finestra completa/STOP-recovery: **PENDING**.
- Approvazione manifest: **PENDING**.
- PR #57: **OPEN, NOT MERGED**.
- Production: **NO-GO**.

Nessun merge, deploy, freeze operativo, apply di migrazioni o modifica Production è autorizzato da questa sezione.
