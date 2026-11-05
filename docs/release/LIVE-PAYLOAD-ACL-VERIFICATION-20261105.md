# Verifica tecnica payload migrazioni e ACL — 2026-11-05

## Ambito e metodo
Verifica esclusivamente read-only sui registri live e sui cataloghi PostgreSQL dei due progetti già esistenti:
- Production: `tctcgptrsmvgajqjgnev`
- QA esistente `bethag-launch-qa`: `jhuyhlzzydcgghrzeexn`

Per ciascuna riga di `supabase_migrations.schema_migrations` è stato calcolato SHA-256 sul contenuto UTF-8 di `array_to_string(statements, E'\\n')`, senza modificare il registro.

## Esito payload live
| Controllo | Esito |
|---|---:|
| Righe Production | 248 |
| Righe QA | 283 |
| Coppie esatte versione/nome comuni | 247 |
| Payload SHA-256 identici tra tutte le coppie comuni | 247/247 |
| Payload SHA-256 differenti tra le coppie comuni | 0 |
| Righe QA-only | 36 |
| Righe Production-only | 1 |

Questa verifica dimostra che i payload SQL registrati nei due ambienti sono byte-identici per tutte le 247 coppie comuni, dopo la normalizzazione limitata alla concatenazione dell'array di statement con newline. Non dimostra, da sola, che ogni payload storico corrisponda al file canonico oggi presente nel repository. I 36 payload QA-only e il payload Production-only sono presenti nel registro live e hanno hash individuali; resta da completare la mappatura puntuale verso sorgenti repository/canonicali e la revisione degli effetti di ciascuna divergenza.

Il solo payload Production-only è `20261104222229_reconcile_production_acl_least_privilege`. La sua SQL live interviene sulla view `public.condominium_fund_availability`, sui due overload transfer-closure helper `check_condominium_member_transfer_closure` e sui default ACL di tabelle postgres-owned. Non revoca EXECUTE sulle funzioni trigger `normalize_zero_ownership_owner()` e `preserve_closing_condominium_member_history()`. La classificazione precedente che associava a questa migrazione la revoca dei due trigger helper era imprecisa e va letta alla luce del payload effettivo.

## Divergenze ACL live confermate

### EXECUTE sulle funzioni trigger pubbliche
Entrambi gli ambienti hanno le funzioni:
- `public.normalize_zero_ownership_owner()`
- `public.preserve_closing_condominium_member_history()`

Sono di proprietà `postgres` e **non** sono `SECURITY DEFINER`.

ACL esplicita in Production:
`{=X/postgres,postgres=X/postgres,service_role=X/postgres}`

ACL esplicita in QA:
`{postgres=X/postgres,service_role=X/postgres}`

Quindi Production conserva EXECUTE a PUBLIC (e dunque anche ai ruoli che lo ereditano), mentre QA lo ha revocato. Il payload QA `20261102044603_revoke_public_execute_from_public_trigger_functions` revoca PUBLIC, anon e authenticated per entrambe. L'esecuzione di trigger non richiede al chiamante EXECUTE sulla funzione trigger; resta da verificare l'esposizione RPC effettiva e decidere una migrazione forward-only specifica per Production. Nessuna modifica è stata eseguita.

### Default ACL di oggetti creati da postgres nello schema public
Valori live `pg_default_acl` per owner `postgres`, schema `public`:

| Tipo oggetto | Production | QA |
|---|---|---|
| Tabelle (`r`) | `{postgres=arwdDxtm/postgres,authenticated=arwd/postgres,service_role=arwdDxt/postgres}` | `{postgres=arwdDxtm/postgres,service_role=Dxt/postgres}` |
| Funzioni (`f`) | `{postgres=X/postgres,service_role=X/postgres}` | `{postgres=X/postgres}` |
| Sequenze (`S`) | `{postgres=rwU/postgres,service_role=rwU/postgres}` | `{postgres=rwU/postgres,service_role=w/postgres}` |

Le lettere ACL sono quelle native PostgreSQL. In particolare:
- Production assegna per default CRUD ad authenticated; QA non lo assegna.
- Production assegna per default CRUD e privilegi strutturali a service_role; QA mostra solo i privilegi strutturali Dxt.
- Production assegna EXECUTE sulle nuove funzioni a service_role; QA non lo assegna.
- Per le sequenze, i default di service_role differiscono.

Questa divergenza è sostanziale e non va pareggiata automaticamente. La sequenza dei payload QA è stata ricostruita:
- baseline 20261017000005 assegna CRUD per default ad anon/authenticated e privilegi ordinari/strutturali a service_role;
- 20261022210630 revoca ALL sulle tabelle per anon e authenticated;
- 20261023000004 dovrebbe ripristinare CRUD per authenticated e service_role e privilegi strutturali a service_role;
- 20261102151610 revoca soltanto MAINTAIN per authenticated/service_role e non spiega la perdita di CRUD.
La riga 20261023000004 esiste nel registro QA e conserva esattamente il payload del file canonico, ma gli effetti non risultano nel catalogo attuale. Non è stato trovato nei payload successivi interrogati un ulteriore ALTER DEFAULT PRIVILEGES che revochi quei CRUD. La causa più probabile è una divergenza tra registrazione della migrazione e applicazione effettiva, oppure una modifica manuale successiva non rappresentata nel ledger; i dati disponibili non consentono di distinguere definitivamente le due ipotesi. La sola presenza della riga nel ledger non prova lo stato attuale. Le differenze su sequenze e default EXECUTE di service_role hanno analoga natura: i payload storici mostrano GRANT, ma il catalogo live QA non li riflette. Non correggere finché non è definito il contratto ACL desiderato e non è stata verificata la causa.

## Verifiche di sicurezza
- Supabase Security Advisor: `lints: []` sia in Production sia in QA.
- L'assenza di lints non annulla le divergenze ACL rilevate direttamente da `pg_proc` e `pg_default_acl`.
- La verifica delle funzioni trigger conferma due EXECUTE PUBLIC in Production e zero in QA.
- Nessuna scrittura, ALTER, REVOKE, GRANT, reset, replay o pulizia dati è stata eseguita.

## CI sul commit documentale
Commit esaminato: `8ad26fadb2155e5255c2fc486bab191bab718dc0`.
- Baseline safety run `41946364010`: SUCCESS.
- Build run `41946364006`: al momento dell'ultima lettura ancora IN_PROGRESS; bootstrap PostgreSQL 17 completato e riuscito, 24 migrazioni clean-install e 15 migrazioni canoniche tramite guarded runner riuscite, rehearsal ACL Production riuscita, build e browser smoke/login riusciti. Era ancora in corso il diagnostic autenticato QA edit/archive. Non dichiarare la CI complessivamente verde finché il job non termina.

## Stato e prossimi controlli
Il punto 5 resta **APERTO**. Per chiuderlo occorre:
1. Completare il confronto puntuale dei 36 payload QA-only e del payload Production-only con i file SQL repository/canonici, distinguendo baseline, storia specifica QA e migrazioni forward-only.
2. Ricostruire la causa della differenza tra il payload QA `application_default_table_privileges` e i default ACL effettivi.
3. Definire le postcondition attese per default ACL di tabelle, funzioni e sequenze, senza alterare i default Supabase-managed di `supabase_admin`.
4. Preparare eventuali migrazioni forward-only e provarle solo su PostgreSQL isolato; nessuna applicazione remota in questa fase.

Production e QA sono rimasti invariati; il solo QA esistente e i suoi dati sono preservati.


## Confronto payload con le sorgenti repository — completamento 2026-11-05
- Le 17 migrazioni QA-only con file corrispondente in `supabase/migrations/` sono state confrontate direttamente: **17/17 payload identici** al contenuto dei file (normalizzazione limitata a CRLF/LF e newline finale).
- Le restanti **19 migrazioni QA-only** non hanno un file autonomo nella cartella canonica attuale. Sono storia QA specifica o payload legacy; gli statement restano nel ledger live, ma non si può dichiarare una corrispondenza con un file canonico inesistente. Sono: `20261102041805_repair_authenticated_communication_rpc_private_execute`, `20261102043152_repair_authenticated_condominium_delete_rpc_private_execute`, `20261102043315_persist_condominium_archive_columns`, `20261102044002_repair_condominium_archive_rpc_and_json`, `20261102044102_repair_authenticated_condominium_archive_rpc_private_execute`, `20261102044224_repair_authenticated_invoker_private_rpc_grants`, `20261102044603_revoke_public_execute_from_public_trigger_functions`, `20261102050437_backfill_condominium_archive_metadata`, `20261102050957_revoke_service_role_maintain_from_fund_availability_view`, `20261102054253_preserve_server_owned_condominium_archive_state`, `20261102054409_add_workspace_member_profile_data`, `20261102100000_repair_authenticated_accounting_rpc_private_execute`, `20261102200820_restore_secure_communication_recipient_rpc_execute`, `20261103072843_qa_align_transfer_wrapper_empty_search_path`, `20261103193927_qa_store_incoming_coowner_profile_metadata`, `20261104122833_grant_service_role_private_resend_event_rpc`, `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff`, `20261104235514_fix_portal_registration_upsert_conflict_target`, `20261105001928_align_qa_fund_availability_view_acl`.
- Il payload Production-only `20261104222229_reconcile_production_acl_least_privilege` è semanticamente identico al draft repository `supabase/rebuild/drafts/20261104150000_reconcile_production_acl_least_privilege.sql` dopo la rimozione dei commenti SQL: 3.397 caratteri SQL normalizzati identici. Le differenze sono commenti descrittivi, non statement eseguibili.
- Quindi: 247/247 payload comuni identici; 17/17 QA-only con file canonico identici; 19 QA-only senza file canonico attuale, non attestabili contro una sorgente canonica; Production-only corrispondente al draft.

## CI aggiornata
Commit `047948b9917b38eddfb0953cecb2939980488d08`:
- Baseline safety run `41946929650`: SUCCESS.
- Build run `41946929620`: SUCCESS.
- PostgreSQL bootstrap, 24 migrazioni clean-install, 15 migrazioni tramite guarded runner, prove ACL isolate, build, browser smoke e autenticazione reale QA per amministratore/collaboratore/condomino sono terminati con successo.
