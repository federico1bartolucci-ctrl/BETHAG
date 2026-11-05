# Classificazione tecnica delle divergenze migrazioni — 2026-11-05

## Criterio
Il registro migrazioni non è una misura di parità di schema. Una riga presente in un solo ambiente va classificata per origine, effetto e destinazione; non va copiata o rimossa per pareggiare i conteggi.

La fotografia verificata è nel file `supabase/rebuild/live-migration-ledgers-20261105.json`: 248 Production, 283 QA, 247 coppie identiche, 1 Production-only, 36 QA-only.

## Production-only (1)

| Versione | Nome | Valutazione |
|---|---|---|
| 20261104222229 | reconcile_production_acl_least_privilege | Migrazione ACL forward-only applicata a Production. La query read-only sul registro live ha restituito il payload SQL. Il draft repository `supabase/rebuild/drafts/20261104150000_reconcile_production_acl_least_privilege.sql` contiene lo stesso insieme di operazioni: SELECT-only sulla view `public.condominium_fund_availability`, revoca EXECUTE anon/PUBLIC ai due helper di chiusura trasferimento, restrizione dei default ACL globali e schema public per oggetti di proprietà postgres. Le differenze testuali sono commenti/intestazioni, non operazioni SQL. È un reperto Production-only legittimo: non copiarlo in QA e non aggiungerlo alla catena canonica senza revisione della sequenza. |

## QA-only (36)

### A. Baseline del branch QA (5)
- `20261017000001 bethag_baseline_schema`
- `20261017000002 bethag_baseline_indexes_views`
- `20261017000003 bethag_baseline_functions`
- `20261017000004 bethag_baseline_security`
- `20261017000005 bethag_baseline_grants`

Sono registrazioni della baseline usata per ricostruire il branch QA. Non sono cinque incrementi da applicare a Production e non vanno inserite nel registro Production esistente.

### B. Hardening ACL/RPC e default privileges del QA (11)
- `20261022210629 restrict_private_function_public_execute`
- `20261022210630 harden_default_privileges_and_private_execute`
- `20261022213544 restrict_close_member_transfer_execute`
- `20261022233440 align_public_function_execute`
- `20261023000001 revoke_authenticated_maintain`
- `20261023000002 revoke_default_maintain`
- `20261023000003 revoke_service_role_maintain`
- `20261023000004 application_default_table_privileges`
- `20261023000733 use_invoker_for_close_transfer_rpc`
- `20261027100000 revoke_public_execute_from_transfer_closure_helpers`
- `20261027110000 repair_service_role_transfer_invoker_path`

Sono migrazioni effettive di hardening e correzione del percorso invoker/privilegi. La loro assenza dal registro Production non prova da sola che il relativo stato sia assente: le verifiche di catalogo e ACL vanno considerate insieme. Non importare queste righe nel registro Production in blocco; l'eventuale promozione deve avvenire tramite la sequenza canonica già revisionata e il runner di cutover, non mediante copia del ledger QA.

### C. Correzioni applicative/archivio e sincronizzazione (8)
- `20261028100000 fix_collaborator_module_permission_boolean`
- `20261102041805 repair_authenticated_communication_rpc_private_execute`
- `20261102043152 repair_authenticated_condominium_delete_rpc_private_execute`
- `20261102043315 persist_condominium_archive_columns`
- `20261102044002 repair_condominium_archive_rpc_and_json`
- `20261102044102 repair_authenticated_condominium_archive_rpc_private_execute`
- `20261102044224 repair_authenticated_invoker_private_rpc_grants`
- `20261102044603 revoke_public_execute_from_public_trigger_functions`

Sono riparazioni nate dal percorso di collaudo/riconciliazione QA: permessi booleani collaboratore, accesso RPC autenticato, colonne e funzioni di archiviazione. Non sono righe da copiare nel ledger Production. Le funzionalità corrispondenti vanno provate sul codice canonico e sul catalogo risultante.

### D. Correzioni successive e specifiche del QA (11)
- `20261102050437 backfill_condominium_archive_metadata`
- `20261102050957 revoke_service_role_maintain_from_fund_availability_view`
- `20261102054253 preserve_server_owned_condominium_archive_state`
- `20261102054409 add_workspace_member_profile_data`
- `20261102200820 restore_secure_communication_recipient_rpc_execute`
- `20261103072843 qa_align_transfer_wrapper_empty_search_path`
- `20261103193927 qa_store_incoming_coowner_profile_metadata`
- `20261104122833 grant_service_role_private_resend_event_rpc`
- `20261104125614 revoke_authenticated_execute_on_unused_private_workspace_staff`
- `20261104235514 fix_portal_registration_upsert_conflict_target`
- `20261105001928 align_qa_fund_availability_view_acl`

Comprendono backfill e preservazione archivio, colonna profilo collaboratore, wrapper e permessi QA, metadati comproprietari, RPC Resend, registrazione portale e ACL della view. Sono storia specifica del QA. Alcune correzioni sono poi rappresentate da migrazioni canoniche forward-only o da verifiche equivalenti: non assumere equivalenza solo dal nome; richiedere confronto del SQL e dei postcondition.

## Limiti probatori e chiusura

1. I 247 abbinamenti versione/nome comuni sono verificati sui registri live. Il dato non dimostra identità dei payload SQL.
2. La migrazione Production-only è stata letta dal registro live e confrontata semanticamente con il draft repository; non è stata riapplicata.
3. Le 36 righe QA-only sono classificate per famiglie in base ai nomi e alla storia del branch. Per certificare ogni payload storico servono i payload SQL originali di ciascuna riga; il registro/versionamento non basta.
4. Gli snapshot 247/47 del 3 novembre restano archivi storici, non sono stati sovrascritti.
5. Nessun reset, replay, scrittura ledger o modifica schema è stato eseguito su Production o QA.

**Esito del sotto-intervento documentale:** completato.  
**Esito del punto 5 complessivo:** ancora aperto finché il controllo automatico non valida questo snapshot e finché non è dimostrata l'identità dei payload storici per tutte le righe comuni/QA-only oppure è formalmente adottato un perimetro di verifica limitato ai payload canonici promossi. Non è corretto dichiarare la chiusura basandosi solo sui conteggi.
