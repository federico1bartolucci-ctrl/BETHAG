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


## Classificazione semantica dei 19 payload QA-only senza file canonico corrente

I seguenti payload sono stati letti direttamente dal registro QA live. La classificazione descrive gli statement effettivi, non deduce il comportamento dal nome della migrazione. Non è stato trovato un file autonomo corrispondente in `supabase/migrations/`; la loro provenienza repository resta quindi **non attestata**. Non vanno copiati in blocco su Production né ricreati come migrazioni canoniche senza una decisione separata.

| Versione / nome live | Effetto SQL effettivo | Classe / cautela |
|---|---|---|
| `20261102041805_repair_authenticated_communication_rpc_private_execute` | Sostituisce `private.reset_stale_communication_recipients` con controlli `auth.uid()` e permesso modulo Comunicazioni; restringe EXECUTE delle implementazioni private a authenticated. | Riparazione RPC/ACL; funzione successivamente ridefinita da 02200820. |
| `20261102043152_repair_authenticated_condominium_delete_rpc_private_execute` | Revoca PUBLIC/anon e concede authenticated su `private.delete_condominium(uuid,bigint,text)`. | Riparazione ACL RPC; la definizione live è SECURITY DEFINER con search_path public, ma i riferimenti a tabelle/helper nel corpo sono qualificati. Non è una modifica introdotta da questo payload; mantenere sotto revisione di hardening. |
| `20261102043315_persist_condominium_archive_columns` | Ridefinisce `private.save_condominium` per persistere `archived_at`, `archived_by`, `archive_reason` e rifiutare l'aggiornamento ordinario di un condominio già archiviato. | Logica lifecycle archivio; superata/rafforzata dal payload 02054253. |
| `20261102044002_repair_condominium_archive_rpc_and_json` | Crea/ridefinisce `private.archive_condominium` e `private.restore_condominium`; aggiorna colonne strutturate, JSON e audit log; assegna/revoca EXECUTE per authenticated. | Riparazione schema-logica e audit; dipende dalle colonne archivio. |
| `20261102044102_repair_authenticated_condominium_archive_rpc_private_execute` | Revoca PUBLIC/anon e concede authenticated sulle implementazioni private archive/restore. | Solo ACL RPC; completa 02044002. |
| `20261102044224_repair_authenticated_invoker_private_rpc_grants` | Revoca PUBLIC/anon e concede authenticated su otto implementazioni private di registrazione portale, bootstrap admin, intake, archivio, pagamenti e codice sicurezza personale. | Riparazione ACL multi-RPC; mantenere i controlli applicativi interni delle funzioni SECURITY DEFINER. |
| `20261102044603_revoke_public_execute_from_public_trigger_functions` | Revoca EXECUTE da PUBLIC, anon e authenticated su `normalize_zero_ownership_owner()` e `preserve_closing_condominium_member_history()`. | Hardening trigger; in QA il catalogo conferma PUBLIC/anon/authenticated assenti. Il trigger continua a funzionare senza EXECUTE del chiamante. |
| `20261102050437_backfill_condominium_archive_metadata` | Backfill una tantum delle colonne archivio dai campi JSON legacy `archivedAt`, `archivedBy`, `archiveReason`. | Migrazione dati non da riprodurre alla cieca; il payload storico va conservato, non rieseguito. |
| `20261102050957_revoke_service_role_maintain_from_fund_availability_view` | Revoca MAINTAIN a service_role sulla view `public.condominium_fund_availability`. | Hardening ACL view; verificare separatamente eventuali privilegi residui sulla relazione. |
| `20261102054253_preserve_server_owned_condominium_archive_state` | Ridefinisce `private.save_condominium` affinché l'upsert ordinario preservi i tre campi archivio server-owned invece di sovrascriverli. | Correzione di integrità dati; è la definizione successiva da considerare rispetto a 02043315. |
| `20261102054409_add_workspace_member_profile_data` | Aggiunge `workspace_members.data jsonb NOT NULL DEFAULT '{}'`. | Modifica schema additiva; la colonna è presente nel catalogo QA live. |
| `20261102100000_repair_authenticated_accounting_rpc_private_execute` | Concede authenticated sulle implementazioni private di chiusura esercizio, carryover, generazione rate e registrazione pagamenti. | Riparazione ACL RPC contabilità; non concede PUBLIC/anon. |
| `20261102200820_restore_secure_communication_recipient_rpc_execute` | Concede USAGE su schema private ad authenticated; ridefinisce reset stale recipients con controlli auth/modulo e restringe EXECUTE a authenticated. | Versione successiva della riparazione comunicazioni 02041805. |
| `20261103072843_qa_align_transfer_wrapper_empty_search_path` | Imposta search_path vuoto su `public.close_condominium_member_transfer(uuid)`. | Hardening funzione wrapper di subentro; effetto circoscritto alla configurazione della funzione. |
| `20261103193927_qa_store_incoming_coowner_profile_metadata` | Crea trigger BEFORE INSERT sui membri per validare e trasferire i metadati dei comproprietari entranti; revoca EXECUTE diretto sulla funzione trigger. | Logica dati/trigger; il trigger e la funzione SECURITY INVOKER con search_path vuoto sono presenti nel catalogo QA. |
| `20261104122833_grant_service_role_private_resend_event_rpc` | Concede USAGE su schema private ed EXECUTE a service_role per `private.apply_resend_communication_event(...)`; revoca PUBLIC/anon/authenticated. | ACL backend webhook, circoscritta a service_role. |
| `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff` | Revoca authenticated da `private.is_workspace_staff(uuid)`. | Riduzione superficie RPC; non eliminare o invertire senza verificare i chiamanti. |
| `20261104235514_fix_portal_registration_upsert_conflict_target` | Ridefinisce helper upsert portale, completamento registrazione e approvazione amministratore; esplicita il matching e il conflitto, verifica workspace/membro/condominio e restringe EXECUTE dell'helper interno. | Correzione logica registrazione/consistenza portale; payload ampio e da trattare come storia QA specifica, non come semplice GRANT. |
| `20261105001928_align_qa_fund_availability_view_acl` | Precontrolla tipo e owner della view e assegna ad authenticated SELECT soltanto, verificando l'assenza degli altri privilegi inclusi MAINTAIN. | Hardening ACL view; il catalogo QA conferma SELECT sì e gli altri privilegi no. |

### Effetti verificati nel catalogo QA live

- Presenti le tre colonne strutturate archivio su `public.condominiums` e la colonna `workspace_members.data`.
- Presente il trigger `trg_apply_incoming_transfer_member_metadata` su `public.condominium_members`.
- Le implementazioni private archivio/registrazione rilevate hanno `SECURITY DEFINER` e search_path vuoto; la funzione trigger incoming co-owner è `SECURITY INVOKER`, search_path vuoto e senza EXECUTE diretto ai ruoli applicativi.
- `private.upsert_portal_access_for_member` è helper interno senza EXECUTE a authenticated/anon/service_role.
- La view `public.condominium_fund_availability` concede ad authenticated SELECT soltanto.
- La funzione `private.delete_condominium` è SECURITY DEFINER e ha search_path public; il corpo letto usa riferimenti qualificati (`public.*`, `private.*`, `auth.*`). La configurazione è da mantenere in elenco di revisione, non va confusa con l'effetto del payload 02043152.

Questa classificazione spiega gli effetti dei payload QA-only, ma non ricostruisce l'autore o il commit originario dei 19 file mancanti. La provenienza storica resta una limitazione documentale esplicita.

## Rehearsal forward-only delle ACL e CI aggiornata

### Default ACL tabelle

Il draft `supabase/rebuild/drafts/20261105010000_reconcile_postgres_public_table_default_acl.sql` è stato provato su PostgreSQL 17 isolato. Il test ora applica il draft **due volte nella stessa transazione** e verifica le postcondition: authenticated CRUD, service_role CRUD più privilegi strutturali, nessun default anon, nessun MAINTAIN applicativo, nessun default globale applicativo e ACL sentinel di `supabase_admin` invariata. La transazione viene annullata. Esito **PASS** nel job `postgres-bootstrap` della build run [41948820926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948820926), commit `1f26698d9ed39fb1c5658999b58e9a2a7c501bef`.

### EXECUTE sulle funzioni trigger in Production

Una nuova lettura read-only Production conferma che entrambe le funzioni:
- restituiscono il tipo PostgreSQL `trigger`;
- non sono SECURITY DEFINER;
- hanno EXECUTE PUBLIC/anon/authenticated in Production, mentre QA non lo ha;
- mantengono EXECUTE esplicito per owner e service_role.

Una funzione che restituisce `trigger` è invocabile nel contesto di un trigger, non come normale funzione RPC. La divergenza non abilita quindi una normale chiamata PostgREST, ma resta un privilegio PUBLIC non necessario. È stato preparato il draft forward-only `supabase/rebuild/drafts/20261105020000_revoke_public_execute_from_public_trigger_functions.sql`, con precontrolli sul tipo/definizione e verifica della conservazione dei privilegi owner/service_role. Il test isolato applica il draft due volte, verifica le ACL e fa rollback. **La relativa CI è in corso sul commit più recente; il draft non è stato applicato a Production o QA.**

### CI e collaudo

- Build run [41948820926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948820926): **SUCCESS**, compresi PostgreSQL 17, 24 clean-install, 15 guarded migrations, draft ACL tabelle con idempotenza, RLS collaborator, build, browser public smoke e autenticazione reale QA. Il diagnostic APP è stato correttamente saltato su questo commit.
- Baseline safety run [41948820834](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948820834): **SUCCESS**.
- Nota di trasparenza: la build precedente [41948515607](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948515607), prima della correzione della condizione workflow, ha eseguito il vecchio script QA browser workflows. Ha prodotto PASS per APP-05, APP-06, APP-08/11 e APP-12, oltre alla navigazione per i tre ruoli. Non è considerata collaudo formale né chiusura di alcuna voce APP. Lo script ha completato il cleanup; una verifica read-only successiva, sul marker esatto del run, ha trovato zero record residui in condomini, comunicazioni, esercizi, movimenti, rate, membri, portal_access, polizze e zero utenti temporanei.
- La condizione workflow è stata corretta: i workflow completi APP sono rinviati alla fase finale APP-01–APP-15. Il collaudo completo resta **NON ESEGUITO** e non viene anticipato.
- Nessuna modifica remota a QA o Production; nessun merge, cutover o reset.


## Recupero delle sorgenti QA-only e snapshot payload esatti — 2026-11-05

La prima ricerca limitata a `supabase/migrations/` non aveva rilevato gli archivi di ricostruzione. La scansione completa dell'albero repository ha individuato **18 file candidati** in `supabase/rebuild/qa-only-migrations/`, `qa-recovered-migrations/` e `qa-only/` per 18 dei 19 payload QA-only non canonici. Il confronto diretto con il ledger QA live ha dato:
- **7/18** file byte-identici al payload live;
- **9/18** file semanticamente equivalenti dopo aver ignorato commenti/formatting; uno di questi presenta solo un diverso ordine di REVOKE/GRANT su funzioni distinte e uno differisce soltanto nel testo dell'errore dell'assertion;
- **2/18** candidati con differenze sostanziali, da non usare come fonte eseguibile del payload live:
  - `20261102043152_repair_authenticated_condominium_delete_rpc_private_execute.sql` nell'archivio concede EXECUTE anche a `service_role`, mentre il ledger live concede soltanto ad `authenticated`;
  - `20261102050437_backfill_condominium_archive_metadata.sql` nell'archivio usa una regex con backslash duplicati; il payload live usa la regex con singolo backslash. Il file alternativo `20261102120000_backfill_condominium_archive_metadata.sql` ha invece SQL semanticamente identico al payload live di 02050437.
- Per `20261104235514_fix_portal_registration_upsert_conflict_target` non è stato trovato un file candidato precedente nel repository.

Per evitare ulteriori ambiguità, è stato acquisito un **snapshot forense esatto di tutti i 19 payload** dal registro live QA in `supabase/rebuild/qa-live-payloads-20261105.json`, conservando le versioni, i nomi e gli array di statement originali. Il file è esplicitamente marcato come prova archivistica, non canonica e non rieseguibile. Questo recupera il contenuto SQL esatto, ma non ricostruisce l'autore o il commit originario dei payload mancanti. I file candidati storici restano conservati senza sovrascritture.

## Contratto default ACL funzioni/sequenze e test isolato

È stato definito il criterio least-privilege per gli oggetti futuri creati da `postgres` in `public`:
- funzioni: default owner-only; EXECUTE a ruoli applicativi solo con GRANT esplicito per singola funzione;
- sequenze: default owner-only; privilegi espliciti per singola sequenza quando necessari;
- nessun default globale per PUBLIC/anon/authenticated/service_role; nessuna modifica ai default Supabase-managed di `supabase_admin`.

La scelta è motivata anche dal catalogo live: non esistono sequenze nello schema public né in QA né in Production. Il draft `supabase/rebuild/drafts/20261105030000_reconcile_postgres_public_function_sequence_default_acl.sql` rimuove soltanto i default per le future funzioni/sequenze postgres-owned nello schema public; non modifica oggetti esistenti o grant espliciti.

Test isolato PostgreSQL 17: il draft è stato applicato due volte nella stessa transazione; i default app-role sono risultati assenti, i sentinel di `supabase_admin` invariati e il rollback è riuscito. Esito **PASS** nella build run [41949423856](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949423856).

## CI completa dei tre draft ACL

Sul commit `ad0688f89d5bec973bf2bb097d9e53822d68d1da`:
- Build run [41949423856](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949423856): **SUCCESS**.
- Baseline safety run [41949423874](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949423874): **SUCCESS**.
- Rehearsal PostgreSQL 17 per default ACL tabelle, EXECUTE delle due funzioni trigger e default ACL funzioni/sequenze: **tutti PASS**, ciascun draft applicato due volte e rollback.
- Clean-install 24 migrazioni, guarded runner 15 migrazioni, Production ACL draft, RLS collaborator, build, browser public smoke e autenticazione reale QA: **PASS**.
- Il diagnostic APP completo è stato saltato, come previsto dalla condizione workflow corretta.
- Nessun draft è stato applicato su QA o Production.


### Dettaglio dei confronti dei 18 file candidati d'archivio

- Byte-identici (7): `20261102044603`, `20261102050957`, `20261102100000`, `20261102200820`, `20261103193927`, `20261104122833`, `20261104125614`.
- Semanticamente equivalenti (9): `20261102041805`, `20261102043315`, `20261102044002`, `20261102044102`, `20261102044224`, `20261102054253`, `20261102054409`, `20261103072843`, `20261105001928`. Per 02044102 cambia soltanto l'ordine delle coppie REVOKE/GRANT su funzioni distinte; per 05001928 cambia soltanto il testo dell'eccezione dell'assertion.
- Non equivalenti (2): `20261102043152` (GRANT aggiuntivo a service_role nel file candidato) e `20261102050437` (regex con escape duplicato nel file candidato). Per 02050437 il file alternativo `20261102120000_backfill_condominium_archive_metadata.sql` coincide semanticamente con il payload live.
- Senza file candidato preesistente (1): `20261104235514_fix_portal_registration_upsert_conflict_target`; il suo payload esatto è comunque preservato nello snapshot forense.

La distinzione tra file candidato, payload effettivamente registrato e snapshot recuperato è vincolante: i file non equivalenti non devono essere usati per ricostruire o riprodurre il ledger.


## Rettifica test ACL default tabelle e nuova evidenza CI — 2026-11-05

Durante la verifica successiva è stato individuato un difetto nel test scripts/test-postgres-default-acl-repair.mjs: una sequenza di newline letterali aveva inglobato la chiamata a psql in un commento JavaScript. Il run precedente 41948820926 aveva quindi riportato PASS senza eseguire il draft delle default ACL tabelle. Quel singolo risultato non è considerato prova valida per tale draft.

Il test è stato corretto: ora la chiamata psql viene eseguita e il draft è applicato due volte nella stessa transazione. Nel run [41951011743](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41951011743), commit 81656e1c3bb0753c6f8ede97a29e57c1be2a40ec, i log mostrano i comandi ALTER DEFAULT PRIVILEGES, entrambe le applicazioni, le asserzioni e il ROLLBACK. Esito PASS effettivo: authenticated CRUD, service_role CRUD più privilegi strutturali, nessun default anon/MAINTAIN, nessun default globale applicativo e sentinel supabase_admin invariato.

Lo stesso run conferma nuovamente PASS per il draft trigger ACL e il draft default ACL funzioni/sequenze, entrambi applicati due volte con asserzioni e rollback. Sono inoltre PASS clean-install 24 migrazioni, guarded runner 15 migrazioni, RLS collaborator, build, browser public smoke e autenticazione reale QA. Baseline safety [41951011690](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41951011690): SUCCESS.

Questa rettifica sostituisce, per la prova del draft default ACL tabelle, l'evidenza non valida del run 41948820926. Nessuna modifica a QA o Production; nessuna migrazione remota applicata.
