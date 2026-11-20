# Piano aggiornato di riconciliazione migrazioni Production/QA — 2026-11-08

## Stato e perimetro

Questo documento aggiorna il piano di riconciliazione usando lo snapshot dei ledger acquisito il **2026-11-07** e presente in `supabase/rebuild/live-migration-ledgers-20261105.json`.

L'attività qui descritta è documentale e di verifica. **Non autorizza né esegue** merge, deploy, migrazioni, replay sui database remoti o modifiche a Production.

## 1. Numeri verificati

| Voce | Production | QA |
|---|---:|---:|
| Record nel ledger | 248 | 283 |
| Coppie versione/nome identiche in entrambi | 247 | 247 |
| Record esclusivi dell'ambiente | 1 | 36 |

La differenza netta è **35 record in più in QA** (283 - 248), ma non significa che esistano soltanto 35 record QA esclusivi: il confronto puntuale rileva **36 record QA-only e 1 Production-only**. La relazione è 36 - 1 = 35.

### Unica migrazione Production-only

- `20261104222229_reconcile_production_acl_least_privilege`

Va preservata come parte della storia effettiva di Production. Non va rinominata, rimossa, sostituita o riprodotta come nuova migrazione. La sua presenza nel ledger Production non implica che debba essere aggiunta al ledger QA senza un piano specifico.

## 2. Classificazione dei 36 record QA-only

### A. Cinque baseline di ricostruzione QA — esclusione dalla sequenza Production

- `20261017000001_bethag_baseline_schema`
- `20261017000002_bethag_baseline_indexes_views`
- `20261017000003_bethag_baseline_functions`
- `20261017000004_bethag_baseline_security`
- `20261017000005_bethag_baseline_grants`

Sono baseline della ricostruzione QA. Non devono essere trasferite o applicate in Production.

### B. Dodici migrazioni canoniche presenti in QA ma assenti dal ledger Production

- `20261022210629_restrict_private_function_public_execute`
- `20261022210630_harden_default_privileges_and_private_execute`
- `20261022213544_restrict_close_member_transfer_execute`
- `20261022233440_align_public_function_execute`
- `20261023000001_revoke_authenticated_maintain`
- `20261023000002_revoke_default_maintain`
- `20261023000003_revoke_service_role_maintain`
- `20261023000004_application_default_table_privileges`
- `20261023000733_use_invoker_for_close_transfer_rpc`
- `20261027100000_revoke_public_execute_from_transfer_closure_helpers`
- `20261027110000_repair_service_role_transfer_invoker_path`
- `20261028100000_fix_collaborator_module_permission_boolean`

La loro presenza in QA non costituisce da sola autorizzazione ad applicarle in Production. Per ciascuna occorre verificare effetto già presente o assente in Production, dipendenze, sicurezza, eventuale sovrapposizione con le migrazioni forward già congelate e test di regressione. Solo le modifiche realmente necessarie potranno entrare in un piano forward separato, senza alterare la cronologia storica.

### C. Diciannove record QA-specifici o storici — non riprodurre alla cieca

- `20261102041805_repair_authenticated_communication_rpc_private_execute`
- `20261102043152_repair_authenticated_condominium_delete_rpc_private_execute`
- `20261102043315_persist_condominium_archive_columns`
- `20261102044002_repair_condominium_archive_rpc_and_json`
- `20261102044102_repair_authenticated_condominium_archive_rpc_private_execute`
- `20261102044224_repair_authenticated_invoker_private_rpc_grants`
- `20261102044603_revoke_public_execute_from_public_trigger_functions`
- `20261102050437_backfill_condominium_archive_metadata`
- `20261102050957_revoke_service_role_maintain_from_fund_availability_view`
- `20261102054253_preserve_server_owned_condominium_archive_state`
- `20261102054409_add_workspace_member_profile_data`
- `20261102100000_repair_authenticated_accounting_rpc_private_execute`
- `20261102200820_restore_secure_communication_recipient_rpc_execute`
- `20261103072843_qa_align_transfer_wrapper_empty_search_path`
- `20261103193927_qa_store_incoming_coowner_profile_metadata`
- `20261104122833_grant_service_role_private_resend_event_rpc`
- `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff`
- `20261104235514_fix_portal_registration_upsert_conflict_target`
- `20261105001928_align_qa_fund_availability_view_acl`

Questi record non vanno copiati nel ledger Production né riprodotti automaticamente. Alcuni hanno una possibile corrispondenza funzionale con migrazioni canoniche Production con timestamp diversi (per esempio `workspace_members.data`, preservazione dei campi di archiviazione, RPC comunicazioni e ACL). La corrispondenza va dimostrata confrontando il SQL effettivamente applicato e lo stato live, non dedotta dal solo nome.

## 3. Evidenze di archivio e replay già disponibili

- PR [#50 — archivio dei 247 payload Production](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/50): i workflow sul commit `17bee4a26dd563f0a74d6263ea8d630bd954b6f1` hanno riportato PASS per integrità archivio, replay del ledger Production candidato su PostgreSQL 17, replay baseline/forward QA su PostgreSQL 17 e build. Riferimenti: [integrità archivio](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41836684530), [replay Production](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41836684466), [replay QA](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41836684582).
- PR #50 è ancora draft e il suo branch è divergente da `main` (426 commit avanti e 1623 indietro al confronto effettuato l'8 novembre). Il risultato positivo del replay è evidenza sul commit di quella PR, non autorizzazione a integrarla né prova che il suo contenuto sia già nel ramo principale.
- PR [#58 — archivio payload live del 5 novembre](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/58) è ancora draft. Include l'archiviazione della migrazione Production-only e due migrazioni QA-only, ma i workflow verificati sul suo head hanno coperto build e baseline safety, non il replay completo. Anche il branch #58 è divergente da `main` (4 commit avanti e 647 indietro al confronto effettuato l'8 novembre).
- La mappa sorgenti in `docs/release/PRODUCTION-MIGRATION-SOURCE-MAP-20261103.md` resta utile per i 247 record storici, ma evidenzia corrispondenze non esatte e collisioni di timestamp. Non usare la directory canonica delle migrazioni come replay storico finché tali collisioni non sono risolte.

## 4. Piano operativo aggiornato

1. **Congelare le evidenze**: mantenere immutati i ledger live acquisiti, i payload originali e gli hash; nessun tentativo di “normalizzare” i ledger remoti.
2. **Consolidare l'archivio Production**: revisionare PR #50 e integrare i suoi contenuti solo dopo riallineamento controllato con `main`, preservando i payload originali e la corrispondenza esatta versione/nome.
3. **Completare l'archivio QA e le evidenze live**: revisionare PR #58, verificare i payload integrali e associare ogni record QA-only al suo SQL effettivo e al relativo hash.
4. **Costruire una matrice effetto-per-effetto** per i 12 record canonici QA-only e i 19 record QA-specifici: effetto già presente in Production, effetto mancante, equivalente canonico con timestamp diverso, esclusivo QA o non determinato. Nessuna migrazione viene selezionata in base al solo nome.
5. **Verificare i due punti funzionali già individuati**:
   - `workspace_members.data`: confrontare schema, default, vincoli e uso applicativo. La migrazione canonica additiva esiste, ma resta non applicata a Production finché il confronto e il rehearsal non sono conclusi.
   - metadati dei comproprietari: restano QA-specifici finché non sia dimostrata la necessità Production e definita una migrazione compatibile, senza trasferire dati di test.
6. **Mantenere separati storia e cutover**: la riconciliazione del ledger storico non deve trasformarsi in un replay delle 36 migrazioni QA-only. Le sole modifiche ammesse a un futuro cutover sono forward migration esplicite, additive e verificate.
7. **Rehearsal isolato e gratuito**: usare CI/PostgreSQL 17 isolato, senza creare nuove risorse Supabase a pagamento. Eseguire bootstrap pulito, replay ordinato, controlli postcondizione e test applicativi mirati.
8. **Aggiornare fingerprint e gate**: qualsiasi variazione a SQL, workflow, script, preflight, postflight o manifest richiede ricalcolo e riesame dei gate. La precedente approvazione non si estende automaticamente a un nuovo commit eseguibile.
9. **Solo dopo**: produrre un piano finale con lista chiusa di migrazioni forward, hash, ordine, preflight, postflight, backup e finestra. Richiedere una nuova approvazione esplicita prima di qualunque operazione Production.

## 5. Gate e stato attuale

- Snapshot ledger: verificato, acquisito il 2026-11-07.
- Conteggi: 248 Production, 283 QA, 247 coppie identiche, 1 Production-only, 36 QA-only.
- Archivio storico Production: replay PostgreSQL 17 e controllo integrità PASS sul commit della PR #50; integrazione nel main ancora bloccata dal branch divergente e dalla revisione.
- Archivio payload live QA/Production aggiuntivi: PR #58 draft; replay completo non dimostrato sul suo head.
- Piano frozen del 5 novembre: 19 migrazioni candidate; approvazione registrata limitata a **READ_ONLY_PREFLIGHT_ONLY**; `production_apply_authorized=false`; approvazione del commit esecutivo finale ancora pendente.
- Production: nessuna migrazione applicata durante questo aggiornamento; nessun deploy o merge eseguito.

**Decisione operativa:** mantenere Production invariata. Il prossimo punto è consolidare e riallineare gli archivi PR #50/#58, quindi completare la matrice di equivalenza; non procedere al cutover.
