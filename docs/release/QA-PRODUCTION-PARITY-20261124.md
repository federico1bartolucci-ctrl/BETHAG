# BETHAG — inventario QA / Production aggiornato

**Data verifica:** 2026-11-24  
**Ambito:** esclusivamente letture Supabase; nessuna modifica a schema, dati, ACL, migrazioni o branch.

## Identificazione ambiente QA

Il progetto QA non compare come progetto autonomo in `list_projects`, ma è ancora presente come branch di Production:

- Parent project: `tctcgptrsmvgajqjgnev`
- QA branch: `bethag-launch-qa`
- Branch ID: `bb7388ab-3007-4de0-9ff6-437a9c53690e`
- Preview project ref: `jhuyhlzzydcgghrzeexn`
- `is_default=false`, `persistent=false`, `with_data=false`
- Branch status: `FUNCTIONS_DEPLOYED`
- Preview status: `ACTIVE_HEALTHY`
- Supabase classifica il branch come preview/ephemeral, non persistente. La documentazione ufficiale precisa che i preview branch possono essere messi in pausa dopo inattività o eliminati alla chiusura/merge della PR e generano usage di compute/servizi secondo consumo. Non è stato convertito in persistent e non è stato creato alcun branch aggiuntivo.
- `with_data=false` indica che non è un clone dei dati Production; i conteggi presenti sono dati propri del branch (seed/test e successive attività), da preservare.

La chiamata `get_project(jhuyhlzzydcgghrzeexn)` restituisce `Project not found`, ma gli endpoint branch-aware `list_migrations`, `list_tables` ed `execute_sql` accettano il preview ref e restituiscono dati. Quindi il branch QA è raggiungibile in sola lettura attraverso il progetto padre; la precedente classificazione come non accessibile era incompleta.

## Inventario migrazioni

| Registro | QA | Production |
|---|---:|---:|
| Righe migration ledger | 283 | 267 |
| Versioni presenti solo nel rispettivo ledger | 24 QA-only | 8 Production-only |
| Coppie versione/nome discordanti per versioni condivise | 0 | 0 |
| Versioni condivise | 259 | 259 |

### Versioni Production non presenti nel ledger QA

- `20261102100100 add_workspace_member_profile_data`
- `20261102100200 preserve_server_owned_condominium_archive_state`
- `20261104130000 reconcile_qa_security_and_coowner_rpcs`
- `20261104222229 reconcile_production_acl_least_privilege`
- `20261105010000 reconcile_postgres_public_table_default_acl`
- `20261105020000 revoke_public_execute_from_public_trigger_functions`
- `20261105030000 reconcile_postgres_public_function_sequence_default_acl`
- `20261105050000 reconcile_portal_registration_upsert`

### Versioni QA non presenti nel ledger Production

- Baseline QA: `20261017000001`–`20261017000005` (cinque migrazioni baseline).
- Migrazioni branch-specifiche QA: `20261102041805`, `20261102043152`, `20261102043315`, `20261102044002`, `20261102044102`, `20261102044224`, `20261102044603`, `20261102050437`, `20261102050957`, `20261102054253`, `20261102054409`, `20261102100000`, `20261102200820`, `20261103072843`, `20261103193927`, `20261104122833`, `20261104125614`, `20261104235514`, `20261105001928`.

Mappature già documentate e da mantenere esplicite, non da risolvere con replay automatico:
- QA `20261102054409` / Production `20261102100100`: aggiunta `workspace_members.data`.
- QA `20261102054253` / Production `20261102100200`: conservazione dello stato archivio server-owned.
- QA `20261102200820` / Production `20261102200855`: ripristino EXECUTE RPC destinatari comunicazioni.
- QA `20261104122833` / Production `20261103070901`: EXECUTE alla RPC privata evento Resend.

Verifica aggiuntiva dei payload SQL live:
- Per tutte le 259 versioni condivise, gli hash dei payload coincidono dopo la sola normalizzazione CRLF/LF. Gli 11 hash grezzi diversi erano dovuti esclusivamente ai terminatori di riga.
- Tre migrazioni QA hanno payload esattamente identico a una versione Production differente:
  - QA `20261102200820` = Production `20261102200855` (RPC destinatari comunicazioni).
  - QA `20261103072843` = Production `20261022202747` (search_path wrapper trasferimento).
  - QA `20261104122833` = Production `20261103070901` (RPC evento Resend).
- Le mappature QA `20261102054253` / Production `20261102100200` e QA `20261102054409` / Production `20261102100100` sono semanticamente documentate come equivalenti, ma i payload non hanno hash identico; richiedono mantenimento della relativa evidenza.
- Mappatura semantica delle otto versioni Production-only:
- `20261102100100` ↔ QA `20261102054409`: stesso `ALTER TABLE ... ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'`; il payload QA è più corto perché non contiene i due commenti introduttivi.
- `20261102100200` ↔ QA `20261102054253`: stessa funzione `private.save_condominium`; differiscono i commenti, non il corpo SQL.
- `20261104130000`: migrazione aggregata Production che ridefinisce `private.archive_condominium`, `private.restore_condominium` e `private.apply_incoming_transfer_member_metadata`. Le definizioni live di queste tre funzioni risultano semanticamente allineate fra QA e Production; la migrazione è rappresentata da interventi QA precedenti/branch-specifici, non da un singolo payload identico.
- `20261104222229`, `20261105010000`, `20261105020000`, `20261105030000`: interventi ACL/default privileges. La loro equivalenza effettiva va verificata nell'audit ACL del Punto 3; non dedurre la parità dal solo conteggio di tabelle o dal ledger.
- `20261105050000`: Production aggiorna `private.upsert_portal_access_for_member`, `private.complete_portal_registration` e `private.admin_approve_portal_registration`. La funzione upsert è semanticamente allineata a QA; le due funzioni di registrazione hanno invece divergenze logiche residue: Production contiene controlli aggiuntivi su ambiguità del condominio, selezione esplicita e lock/ordine di lock.

Queste mappature descrivono lo stato effettivo osservato; non autorizzano replay automatico né scritture remote.

Le altre divergenze includono baseline e interventi branch-specifici; la corrispondenza semantica va verificata per singolo payload. Non eseguire replay, inserimenti nel ledger o migrazioni di riallineamento senza una matrice versioni/payload approvata.

## Parità catalogo strutturale

| Oggetto | QA | Production | Esito |
|---|---:|---:|---|
| Tabelle public | 47 | 47 | stessi nomi |
| Colonne public | 627 | 627 | hash inventario identico |
| Tabelle con RLS attiva | 47 | 47 | allineate |
| Vincoli | 305 | 305 | un'unica differenza testuale |
| Indici | 257 | 257 | hash inventario identico |
| Policy RLS | 103 | 103 | una differenza sostanziale |
| Trigger applicativi | 147 | 147 | hash inventario identico |
| Funzioni public/private | 173 | 173 | 9 hash diversi, 2 divergenze logiche |
| Viste | 1 | 1 | hash inventario identico |

### Vincolo con differenza testuale

`condominium_work_progress_financial_consistency_chk` ha la stessa condizione logica nei due ambienti; la definizione QA contiene un diverso livello di parentesi attorno al controllo percentuale. Nessuna differenza semantica rilevata.

### Policy RLS con differenza sostanziale

`portal_registration_requests / managers read portal registration requests`:
- QA: consente SELECT solo quando `workspace_id` è valorizzato e l'utente gestisce il modulo Portale in quel workspace.
- Production: include anche le richieste senza `workspace_id`, se il nome condominio corrisponde a un condominio attivo in un workspace gestito dall'utente.

La policy Production supporta la gestione delle richieste non assegnate; la policy QA non replica questo caso. Non modificata.

### Funzioni con differenza

Nove funzioni presentano hash grezzi diversi:
- `admin_approve_portal_registration`
- `apply_incoming_transfer_member_metadata`
- `archive_condominium`
- `can_access_workspace_module`
- `can_manage_workspace_module`
- `complete_portal_registration`
- `restore_condominium`
- `save_condominium`
- `upsert_portal_access_for_member`

Dopo normalizzazione CRLF/LF e confronto del testo:
- Divergenze logiche sostanziali: `admin_approve_portal_registration` e `complete_portal_registration`.
- Le versioni Production aggiungono controlli di disambiguazione del condominio, gestione delle richieste non assegnate e lock/ordine di lock per prevenire collegamenti concorrenti o ambigui dell'account residente.
- Le altre differenze rilevate sono formattazione CRLF/LF o un commento, senza variazione logica rilevata.

Le due funzioni di registrazione richiedono una decisione applicativa esplicita su quale comportamento debba essere canonico. Non sovrascrivere QA o Production automaticamente.

## Conteggi dati — non costituiscono parità dati

Il branch QA riporta `with_data=false` nei metadati Supabase; i conteggi effettivi letti differiscono da Production. Alcuni esempi rilevanti:

| Tabella | QA | Production |
|---|---:|---:|
| workspaces | 1 | 1 |
| condominiums | 68 | 6 |
| condominium_units | 62 | 65 |
| condominium_members | 16 | 20 |
| condominium_member_transfers | 1 | 11 |
| condominium_fiscal_years | 17 | 0 |
| condominium_ledger_entries | 14 | 0 |
| condominium_installments | 13 | 0 |
| condominium_expense_allocations | 13 | 0 |
| condominium_audit_log | 22 | 0 |
| communications | 4 | 4 |
| documents | 4 | 4 |
| portal_access | 1 | 1 |
| profiles | 3 | 2 |
| workspace_members | 3 | 2 |

Questi dati non dimostrano né un difetto né una replica completa. Confermano che QA e Production contengono dataset diversi. Nessuna pulizia, copia o reset è stata eseguita.

## Esito e prossimi gate

**Punto 2: CHIUSO — riconciliazione inventari e collaudo applicativo QA completati il 24 novembre 2026.**

### Collaudo live APP-01..APP-15

- Workflow: [Final QA collaudo, run 45485248003](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45485248003).
- Evento: pull request #431, branch `integration/accounting-point1-main-20261124`.
- Commit verificato: `bde7ddf4a721f36ac521774c57f2ed891b95eba0`.
- Job `final-qa-collaudo`: **SUCCESS**; tutti gli step completati con esito positivo.
- APP-01..04, APP-05..07, APP-08..11, APP-12, APP-13 e APP-15: PASS nei rispettivi test autenticati/API/UI. I test APP-14/Phase 1 e i flussi Edge Functions previsti dal workflow sono terminati PASS.
- APP-12 webhook Resend firmato: PASS. Il probe di invio live è stato escluso dall'autorizzazione e non è stato eseguito.
- APP-15: navigazione e persistenza sessione verificate per admin, collaborator e resident; nessun errore browser non gestito.
- Il test APP-07 ha verificato il blocco di modifica contabile su fixture QA persistente di esercizio chiuso; il valore originale è rimasto invariato. La fixture è stata mantenuta, non cancellata.
- Fixture temporanee APP-05/06 eliminate; cleanup browser verificato; documenti e oggetti Storage temporanei rimossi.
- Il piano workspace è stato portato temporaneamente da `free` a `portal` e ripristinato a `free`. Verifica read-only successiva sul progetto QA: `workspace_plan=free`.
- Preview QA arrestato regolarmente; diagnostica APP-15 caricata come artifact `bethag-app15-diagnostics` (artifact ID `14964446568`).

La run non ha eseguito invii reali Resend, merge, deploy, reset o ricreazione del QA. Non è stato creato alcun ambiente a pagamento. I dati QA/Production restano distinti e preservati.

## Punto 3 — audit ACL/security read-only (24 novembre 2026)

### Inventario live QA e Production

Le query sono state eseguite in sola lettura sul branch QA esistente `jhuyhlzzydcgghrzeexn` e su Production `tctcgptrsmvgajqjgnev`.

| Controllo | QA | Production | Esito |
|---|---:|---:|---|
| Funzioni public/private | 173 | 173 | ACL semantiche identiche |
| Funzioni SECURITY DEFINER | 73 | 73 | nessuna eseguibile da anon |
| Funzioni trigger | 103 | 103 | ACL identiche |
| Trigger applicativi | 147 | 147 | definizioni e stato identici |
| Tabelle public con RLS | 47 | 47 | ACL tabella identiche |
| Policy RLS | 103 | 103 | una differenza già classificata |
| Security Advisor | 0 lint | 0 lint | nessun rilievo |

Per le 173 funzioni sono stati confrontati firma, owner, SECURITY DEFINER, configurazione `search_path`, ACL normalizzate e privilegi effettivi. Le sei differenze testuali iniziali delle ACL erano soltanto l'ordine degli elementi; dopo normalizzazione il numero di differenze semantiche è **zero**. Nessuna funzione public/private è eseguibile da `anon`. Tutte le funzioni SECURITY DEFINER hanno un `search_path` esplicito. I ruoli applicativi non hanno CREATE sugli schemi `public` e `private`.

I 147 trigger applicativi e le 103 funzioni trigger coincidono tra QA e Production, inclusi stato di abilitazione, funzione associata e definizione. Le 47 tabelle hanno RLS attiva e ACL identiche; non risultano privilegi diretti per `anon`.

### Differenze dei default ACL — non introdotte dai candidati contabili

I default ACL del ruolo `postgres` nello schema `public` restano diversi:

| Tipo | QA | Production |
|---|---|---|
| Tabelle | `{postgres=arwdDxtm/postgres,service_role=Dxt/postgres}` | `{postgres=arwdDxtm/postgres,authenticated=arwd/postgres,service_role=arwdDxt/postgres}` |
| Funzioni | `{postgres=X/postgres}` | `{postgres=X/postgres}` |
| Sequenze | `{postgres=rwU/postgres,service_role=w/postgres}` | `{postgres=rwU/postgres}` |

Le differenze sono coerenti con la catena forward-only presente nel solo ledger Production:
- `20261105010000`: default CRUD per authenticated e privilegi applicativi/strutturali per service_role sulle future tabelle public.
- `20261105020000`: revoca EXECUTE diretto su due funzioni trigger pubbliche.
- `20261105030000`: revoca dei default EXECUTE e dei default sulle sequenze nello schema public.

Non sono state pareggiate: Production è la baseline da preservare e i candidati del Punto 1 non creano nuove tabelle o sequenze. Nessuna ALTER DEFAULT PRIVILEGES remota è stata eseguita.

### Difetto individuato: default EXECUTE globale per nuove funzioni private

La migrazione storica `20261022210630_harden_default_privileges_and_private_execute.sql` contiene:

`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`.

Questa revoca schema-specifica non annulla il privilegio EXECUTE concesso dal default globale PostgreSQL: i default ACL di schema si sommano a quelli globali. Nei cataloghi live non esiste un default ACL globale per le funzioni del ruolo postgres né un default ACL specifico per private; quindi una nuova funzione creata da postgres in private erediterebbe PUBLIC EXECUTE. È un difetto prospettico, non un'esposizione corrente: le 173 funzioni live non sono eseguibili da anon e le ACL delle funzioni private già esistenti sono state ristrette individualmente. L'ultima evidenza disponibile della Dashboard Data API (5 novembre 2026) mostra `private` non esposto; la configurazione API non è stata riletta oggi e dovrà essere riconfermata prima della chiusura definitiva del Punto 3.

È stato preparato, ma **non applicato**, il draft forward-only:
`supabase/rebuild/drafts/20261124215000_revoke_postgres_global_public_function_execute.sql`.

Il draft revoca il default globale EXECUTE per PUBLIC/anon/authenticated/service_role sulle nuove funzioni create da postgres. Non modifica funzioni esistenti, default ACL specifici di schema (ad esempio storage) né default dei ruoli Supabase-managed.

La regressione `scripts/private-function-default-acl-repair-regression.sql` è stata eseguita su PostgreSQL 17 isolato, due applicazioni del draft nella stessa transazione, poi ROLLBACK: **PASS**. Verifica che nuove funzioni private/public non ereditino EXECUTE applicativo, che i grant specifici storage restino efficaci, che le ACL delle funzioni esistenti non cambino e che i default `supabase_admin` restino invariati.

### Hardening ACL dei due trigger contabili candidati

La revisione ha rilevato che:
- `guard_ledger_entry_integrity()` diventa SECURITY DEFINER nel candidato 24240200, ma il precedente GRANT a authenticated sarebbe rimasto con CREATE OR REPLACE. Aggiunta revoca EXECUTE a PUBLIC/anon/authenticated, preservando owner e service_role.
- `prevent_work_delete_with_progress()` è una nuova funzione trigger SECURITY DEFINER. Aggiunta revoca EXECUTE a PUBLIC/anon/authenticated/service_role.

Le regressioni PostgreSQL 17 provano sia l'assenza di EXECUTE diretto per i ruoli applicativi sia l'effettivo funzionamento dei trigger sotto authenticated con RLS che nasconde le righe SAL:
- `work-progress-payment-allocation`: PASS.
- `work-delete-sal-guard`: PASS.
- `supporting-regressions`, inclusa la prova dei default ACL globali: PASS.
- `fiscal-year-parent-row-locks`: PASS.
- `chronological-candidate-chain`: PASS.

Run CI: [Accounting point 1 PostgreSQL 17 regression 45488640834](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45488640834). Build [45488661186](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45488661186) e baseline safety [45488661137](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45488661137): SUCCESS.

Queste modifiche restano file candidati/draft e test isolati. Nessuna ACL, funzione, trigger o default privilege è stata modificata su QA o Production.

### Stato dei gate successivi

1. **Punto 1 — CHIUSO tecnicamente:** consolidamento e regressioni SQL isolate completati; nessuna autorizzazione di merge/deploy implicita.
2. **Punto 2 — CHIUSO:** inventari e riconciliazione semantica documentati; collaudo APP-01..APP-15 live sul QA esistente completato PASS.
3. **Punto 3 — IN CORSO:** audit read-only QA/Production completato; hardening dei due trigger candidati e draft forward-only per i default EXECUTE globali provati su PostgreSQL 17 isolato. Restano da riconfermare le impostazioni Data API correnti e da decidere/approvare l'eventuale migrazione forward-only; nessuna applicazione remota eseguita.
4. **Punto 4 — NON INIZIATO:** aggiornamento manifest e nuova approvazione, subordinati alla chiusura del Punto 3.

La regressione SQL isolata non sostituisce il collaudo live; ora entrambi i livelli risultano superati per il Punto 2. Nessun DDL/DML remoto, modifica ACL, replay migrazioni, merge o deploy è stato eseguito.
