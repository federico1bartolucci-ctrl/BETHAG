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

**Punto 2: IN CORSO, non certificato.**

Sono ora disponibili gli inventari live in sola lettura. Non è ancora possibile dichiarare parità completa:
1. il ledger presenta 24 versioni QA-only e 8 Production-only, da riconciliare per payload e mappatura;
2. una policy RLS differisce;
3. due funzioni di registrazione hanno differenze logiche;
4. i dataset sono diversi e devono restare preservati;
5. il branch è non-persistent e con `with_data=false`: il suo stato e la sua continuità vanno certificati senza reset o ricreazione.

Non è stato eseguito alcun DDL/DML remoto, modifica ACL, replay migrazioni, reset, merge o deploy. Non è stato creato alcun ambiente o costo aggiuntivo.