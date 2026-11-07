# BETHAG — runbook operativo STOP / recovery e finestra Production

**Data aggiornamento:** 2026-11-07  
**PR:** #57 — `fix/qa-view-acl-parity-20261105`  
**Stato runbook:** CHIUSO PER REVISIONE OPERATIVA; esecuzione Production NON autorizzata da questo documento.

## 1. Finestra e responsabilità

- Inizio: **7 novembre 2026, ore 22:00 Europe/Rome**.
- Termine pianificato: **8 novembre 2026, ore 00:00 Europe/Rome**.
- Qualsiasi prosecuzione oltre le 00:00 richiede una nuova decisione esplicita del proprietario; la disponibilità personale oltre tale ora non proroga automaticamente la finestra.
- Operatore umano locale: **Federico Bartolucci**.
- Proprietario e approvatore finale: **Federico Bartolucci**.
- ChatGPT: supporto tecnico e checklist; non è l'operatore umano e non può attestare attività locali non osservate.
- Revisore indipendente a quattro occhi: non disponibile. Il limite è dichiarato e non viene presentato come revisione indipendente.

La finestra non equivale ad autorizzazione, freeze, comunicazione agli amministratori o permesso di eseguire SQL.

## 2. Identità immutabili del cutover

- Repository: `federico1bartolucci-ctrl/BETHAG`.
- Progetto Supabase Production: `tctcgptrsmvgajqjgnev`.
- Snapshot Production: **248 righe**; tutte le 248 coppie versione/nome devono restare identiche.
- Head atteso prima del cutover: `20261104222229_reconcile_production_acl_least_privilege`.
- Migrazioni incrementali autorizzabili: esattamente le 19 seguenti, nell'ordine riportato. I valori sono Git blob SHA e devono coincidere byte per byte con i file SQL del checkout approvato.

| # | Migrazione | Git blob SHA |
|---:|---|---|
| 1 | `20261022210629_restrict_private_function_public_execute.sql` | `1476e921de9a43e3c046ef448a91c28d3515fd8c` |
| 2 | `20261022210630_harden_default_privileges_and_private_execute.sql` | `09751ed091c507d1db13ac48deba5f336e835a13` |
| 3 | `20261022213544_restrict_close_member_transfer_execute.sql` | `7cf291acd1c1734959c5fef6c6f0477bbe0e24bf` |
| 4 | `20261022233440_align_public_function_execute.sql` | `6987025124872b7f98c53c689bb014262624cba6` |
| 5 | `20261023000001_revoke_authenticated_maintain.sql` | `b5c1cab798c61eeb63794400f6087767596c7372` |
| 6 | `20261023000002_revoke_default_maintain.sql` | `8e55313ed2c9f6009f53c8f0ca1eb9dfbd042f79` |
| 7 | `20261023000003_revoke_service_role_maintain.sql` | `ca2115dbbbb64fd3868b54d9651f65e299a62edb` |
| 8 | `20261023000004_application_default_table_privileges.sql` | `20ebaed750f028e6e10172c7a85e67356a2ef21d` |
| 9 | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | `bcbde9f82db1c931b5d2503987fa1da2b2b13b0a` |
| 10 | `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql` | `5b7a34ee56f4a1cb1b1a145760aff5880e84e5f7` |
| 11 | `20261027110000_repair_service_role_transfer_invoker_path.sql` | `0b50853114442b946abb2cac8ab37fe6db64e074` |
| 12 | `20261028100000_fix_collaborator_module_permission_boolean.sql` | `f2f7e559daa5145ef036e68d5366290798a44b9d` |
| 13 | `20261102100100_add_workspace_member_profile_data.sql` | `ec905c74412dae599a443b5ebbe492f9d5826afc` |
| 14 | `20261102100200_preserve_server_owned_condominium_archive_state.sql` | `130de21194958cb80b7b87e4aafdf7cc60435c7c` |
| 15 | `20261104130000_reconcile_qa_security_and_coowner_rpcs.sql` | `a445bc47d71e1d5e27e654e0802d292a8b653d8f` |
| 16 | `20261105010000_reconcile_postgres_public_table_default_acl.sql` | `104966fe4315c04238b424beab4fb6a52d2b24ed` |
| 17 | `20261105020000_revoke_public_execute_from_public_trigger_functions.sql` | `2ed0e4aa1f7f8b97c52d054f2a0dacdf54e2e53f` |
| 18 | `20261105030000_reconcile_postgres_public_function_sequence_default_acl.sql` | `4702930eb40f85405053a0db10be70bc9987e3f9` |
| 19 | `20261105050000_reconcile_portal_registration_upsert.sql` | `43029cf687106b22a1067c7205695ddf6677d145` |

**Vincoli:** non inserire baseline; non rieseguire migrazioni già applicate; non cancellare, rinominare o riscrivere le 248 righe storiche; non alterare i 19 payload; non sostituire il runner 248+19 con runner storici 247+12 o equivalenti.

## 3. Gate obbligatori prima di avviare il runner

L'operatore deve interrompere la procedura prima di qualsiasi DDL/DML se anche una sola condizione non è soddisfatta:

1. Checkout pulito e SHA completo uguale allo SHA finale approvato; nessuna modifica locale.
2. Tutti i workflow richiesti (Final QA APP-01..APP-15, Build/PostgreSQL 17, Baseline Safety) SUCCESS sullo SHA approvato o sulla precisa relazione di provenienza QA ammessa dal runner.
3. Il guarded read-only preflight, eseguito localmente sullo stesso SHA, restituisce `READ_ONLY_PRODUCTION_PREFLIGHT_PASS`, 248/248 coppie esatte, head atteso e 19/19 hash esatti.
4. Backup automatico corrente visibile e identificabile prima dell'intervento; annotare timestamp UTC, identificativo e stato visibile. Non dichiarare un restore fisico testato.
5. Data API Production verificata nella Dashboard: `public` e `graphql_public` esposti; `private` non esposto; `supabase_functions` assente dagli exposed schemas; esposizione automatica di nuove tabelle disattivata. Evidenza acquisita il 7 novembre 2026: 2/3 schemi esposti (`graphql_public`, `public`), `private` non selezionato; `supabase_functions` non compare nell'elenco dei tre schemi disponibili; 0/48 tabelle e 0/171 funzioni esposte.
6. Nessun override PostgREST o configurazione alternativa che esponga `supabase_functions`; se non verificabile, STOP.
7. Operatore presente, accesso PostgreSQL funzionante, credenziali custodite localmente e percorso di escalation disponibile. Le credenziali non vanno inserite in chat o nei log.
8. Approvazione finale scritta del proprietario che riporti esattamente SHA eseguibile, i 19 hash ordinati, progetto Production, operatore, finestra, rischio backup residuo e accettazione dei criteri STOP.
9. Finestra ancora valida. Dopo le 00:00 dell'8 novembre non proseguire senza nuova decisione esplicita.

## 4. Procedura durante l'esecuzione

- Usare esclusivamente `scripts/apply-reviewed-production-migrations.mjs` in modalità guarded/apply prevista dal repository, dal checkout esatto approvato e con i controlli interni attivi.
- Non usare Supabase MCP `apply_migration`, SQL Editor, query manuali o runner storici come sostituti.
- Non cambiare ordine, hash, contenuto o numero delle migrazioni.
- Eseguire una sola sessione operativa; niente workflow concorrenti che scrivano su Production.
- Conservare output completo, orari UTC, SHA, identificativo della migrazione e risultato dei controlli. Oscurare segreti e stringhe di connessione.
- Non inviare comunicazioni di riapertura e non riattivare l'accesso degli utenti fino al PASS di tutti i postflight e smoke test.

## 5. Criteri STOP immediato

Fermare il runner e non lanciare il comando successivo se si verifica uno qualsiasi dei seguenti eventi:

- SHA, branch, progetto/ref, head ledger, conteggio 248 o una coppia versione/nome non coincidono.
- Anche un solo Git blob SHA SQL non coincide o la sequenza non è esattamente 19.
- Preflight, backup gate, Data API gate, approvazione o finestra non sono validi.
- Errore SQL, timeout, deadlock, lock inatteso, permesso negato, dipendenza mancante o postcondition fallita.
- Connessione persa durante una migrazione o esito di commit non determinabile.
- Il runner segnala una migrazione già presente, una versione inattesa, un conteggio diverso da quello previsto o qualsiasi divergenza.
- Compare una modifica inattesa a dati applicativi, ledger storico, ACL/RLS, ownership o oggetti non previsti.
- Il tempo residuo non consente di completare migrazioni, postflight e smoke test entro le 00:00.

**Dopo STOP:** non rilanciare il runner dall'inizio, non ripetere la migrazione dubbia, non modificare manualmente il ledger e non eseguire SQL correttivo improvvisato. Salvare output e stato; annotare l'ultima migrazione con esito certo e quella con esito incerto; lasciare Production in manutenzione/isolata secondo il piano concordato; richiedere analisi tecnica e nuova approvazione prima di qualsiasi ripresa.

## 6. Recovery e gestione degli esiti

- **Errore prima di qualsiasi scrittura:** mantenere Production invariata; correggere la causa fuori Production; creare un nuovo SHA; ripetere CI e preflight; ottenere nuova approvazione esatta.
- **Errore durante una migrazione:** considerare lo stato potenzialmente incerto finché non è verificato con query read-only. Non assumere che tutte le istruzioni siano state rollbackate. Non aggiungere o cancellare righe ledger per simulare un esito. La ripresa richiede una diagnosi del catalogo e del ledger, un piano forward-only verificato e nuova approvazione.
- **Migrazione completata ma postcondition fallita:** STOP; non passare alla migrazione seguente. Acquisire catalogo/ACL/ledger e log; preparare una correzione forward-only su branch/QA, provarla integralmente e sottoporla a nuova approvazione. Non tentare rollback generico di DDL.
- **Connessione persa con commit incerto:** non riprovare. Riconnettersi in sola lettura, verificare ledger e postcondizioni della migrazione interessata e chiedere decisione tecnica prima di riprendere.
- **Postflight o smoke autenticato fallito:** mantenere BETHAG non disponibile agli utenti; niente dichiarazione di rilascio. Diagnosticare senza alterare dati reali; correggere in QA, ricertificare e approvare un nuovo piano. Un ripristino da backup è una decisione separata, da eseguire solo con procedura Supabase supportata e destinazione approvata; mai improvvisare restore in-place.
- **Riapertura:** consentita solo dopo ledger 267 righe, 248 storiche identiche, 19 nuove identità esatte, tutte le postcondition ACL/RLS/funzioni/colonne/trigger/default ACL, e smoke autenticati admin/collaboratore/condomino PASS. APP-14 resta PARTIAL fino a tale momento.

Non è previsto un rollback automatico delle 19 migrazioni. Il piano è forward-only con STOP e recovery controllato. Il restore fisico provider-managed non è stato testato e non viene dichiarato disponibile/verificato.

## 7. Rischio backup residuo dichiarato

- Backup automatici GitHub/Supabase: presenza documentata nelle evidenze di progetto; l'operatore deve verificare il backup corrente immediatamente prima della finestra.
- Restore logico locale: verificato in precedenza.
- Restore fisico provider-managed: **NON TESTATO**. La funzione a pagamento “Restore to a New Project” è stata rifiutata; nessun progetto a pagamento è autorizzato.
- Il proprietario ha già accettato questo rischio residuo. L'accettazione non equivale a una prova di restore fisico né elimina il rischio.
- Nessun restore in-place su Production.

## 8. Stato di approvazione

- Runbook STOP/recovery: **CHIUSO come procedura documentale**, subordinato all'esecuzione puntuale dei gate sopra.
- Verifica Data API Production: **PASS su evidenza Dashboard del proprietario**, 7 novembre 2026.
- Preflight read-only: **PASS storico** sul precedente SHA `17d141910a4f6902fef52a65e48845717eca9b02`; deve essere ripetuto sullo SHA generato da questo aggiornamento documentale.
- Approvazione finale exact-SHA: **PENDING**.
- Merge PR #57: **NO**.
- Deploy / DDL / DML / ledger write Production: **NO**.
- Freeze operativo e avviso amministratori: **NON ATTIVATI / NON INVIATO**.

L'aggiornamento di questo documento genera un nuovo commit e invalida l'uso del precedente SHA come SHA eseguibile finale. Prima di chiedere l'approvazione finale occorre eseguire i workflow richiesti e il preflight read-only sul nuovo SHA esatto. L'approvazione non è implicita nella chiusura del runbook.

**Decisione corrente: PRODUCTION NO-GO fino a nuova certificazione exact-SHA e approvazione finale scritta.**
