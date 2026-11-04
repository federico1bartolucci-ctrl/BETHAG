# Ripristino e certificazione ambiente QA — 2026-11-04

## Stato attuale

- Supabase project QA: `jhuyhlzzydcgghrzeexn`
- Branch: `bethag-launch-qa`
- Branch ID: `bb7388ab-3007-4de0-9ff6-437a9c53690e`
- Provider status: `MIGRATIONS_FAILED`
- Preview project status: `ACTIVE_HEALTHY`
- QA migration ledger: 34 righe, ultima `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff`
- Production: 247 migrazioni, ultima `20261103070901_grant_service_role_private_resend_event_rpc`

## 1. Riconciliazione della cronologia

Il registro QA è una sequenza branch-specifica di 34 migrazioni, non una copia diretta della catena canonica da 23 file.

| Fonte SQL per la riproduzione QA | Numero |
|---|---:|
| Migrazioni canoniche con coppia versione/nome esatta | 17 |
| Migrazioni QA archiviate con coppia versione/nome esatta | 12 |
| Migrazioni QA recuperate dal campo `statements` del registro live Supabase | 5 |
| **Totale** | **34** |

I cinque payload precedentemente assenti dal repository sono stati recuperati direttamente da `supabase_migrations.schema_migrations.statements` sul database QA. Non sono più ricostruzioni semantiche: sono i payload SQL storici conservati dal registro e sono archiviati in `supabase/rebuild/qa-recovered-migrations/`.

Il recupero ha permesso di correggere un errore sostanziale nella prima bozza della migrazione comproprietari: il payload originale imposta la funzione trigger come `SECURITY INVOKER` e revoca tutti i privilegi EXECUTE diretti da `PUBLIC`, `anon`, `authenticated` e `service_role`.

### Mappatura rispetto alla catena canonica

- `20261022202747_harden_close_member_transfer_search_path` è rappresentata in QA da `20261103072843_qa_align_transfer_wrapper_empty_search_path`; l'operazione SQL è identica.
- `20261102100100_add_workspace_member_profile_data` è rappresentata da `20261102054409_add_workspace_member_profile_data`; entrambe aggiungono la stessa colonna JSONB.
- `20261102100200_preserve_server_owned_condominium_archive_state` è rappresentata da `20261102054253_preserve_server_owned_condominium_archive_state`; la definizione della funzione è equivalente.
- `20261102151610_harden_live_production_acl_and_transfer_invoker` consolida hardening già presente nelle migrazioni condivise QA `20261023000001`–`20261023000004`, `20261023000733`, `20261027100000` e `20261027110000`.
- `20261102200855_restore_secure_communication_recipient_rpc_execute` è rappresentata da `20261102041805` seguita da `20261102200820`; il secondo payload è stato recuperato dal registro live.
- `20261103070901_grant_service_role_private_resend_event_rpc` è rappresentata da `20261104122833`; il payload è stato recuperato dal registro live.

Due file archivio non hanno una versione corrispondente nel registro live e restano esclusi dalla riproduzione:
- `20261102110000_revoke_service_role_maintain_from_fund_availability_view`: stessa operazione di `20261102050957`, ma timestamp differente.
- `20261102120000_backfill_condominium_archive_metadata`: variante corretta della regex rispetto al file archiviato `20261102050437`. Il QA live non presenta righe con marker archivio JSON legacy né righe con timestamp archivio strutturato mancante; non è quindi giustificata alcuna DML correttiva aggiuntiva.

## 2. Replay PostgreSQL 17 isolato

<badge>PASS</badge>

- Workflow dedicato: [run #7 — 41843324816](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41843324816)
- Risultato: `success`
- Database: PostgreSQL 17 usa e getta
- Il test verifica copertura uno-a-uno delle 34 coppie versione/nome e riproduce in ordine tutte le 34 migrazioni.
- Verifica postcondizioni: 47 tabelle pubbliche, 47 tabelle con RLS, zero privilegi MAINTAIN per i ruoli applicativi, wrapper trasferimento SECURITY INVOKER, accesso schema private, colonne archivio e dati profilo, trigger comproprietari e ACL delle RPC di comunicazione.

Il primo tentativo era fallito per una regex del test con escaping errato nel riconoscimento dei nomi file; la regex è stata corretta. Il replay completo con i payload recuperati dal registro è poi passato.

## 3. Inventario del database QA live

Lettura di catalogo in sola lettura:

| Oggetto / controllo | Risultato |
|---|---:|
| Tabelle pubbliche | 47 |
| Colonne pubbliche | 627 |
| Vincoli | 304 |
| Indici | 257 |
| Viste | 1 |
| Funzioni public/private | 172 |
| Policy RLS | 103 |
| Tabelle con RLS attiva | 47 |
| Trigger | 147 |
| Relazioni pubbliche con MAINTAIN per anon/authenticated/service_role | 0 |

La differenza rispetto al baseline canonico è coerente con la funzione e il trigger QA dedicati ai metadati dei comproprietari.

Verifiche ACL live:
- trigger comproprietari: SECURITY INVOKER; nessun EXECUTE diretto per anon, authenticated o service_role;
- RPC private di preparazione e ripristino destinatari comunicazioni: EXECUTE per authenticated;
- RPC privata di evento Resend: EXECUTE per service_role, non per authenticated;
- funzione privata `is_workspace_staff`: nessun EXECUTE per authenticated;
- vista `condominium_fund_availability`: nessun MAINTAIN per service_role.

Supabase Security Advisor: zero linter di sicurezza. Performance Advisor: 35 indici non utilizzati e 21 gruppi di policy permissive multiple; sono avvisi di performance da trattare in un punto successivo, non errori di migrazione.

## 4. Accesso reale e persistenza sessione

<badge>PASS</badge>

- Workflow BETHAG build #2740: [run 41843109445](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41843109445)
- Build, controlli baseline, security parity, PostgreSQL bootstrap, guardie comunicazioni e browser smoke pubblico: PASS.
- Step `Certify real QA authentication and session persistence`: PASS.
- Account verificati: amministratore, collaboratore, condomino.
- Per ciascun ruolo: login Supabase Auth, landing page coerente col ruolo, refresh e persistenza sessione, nessun errore browser non gestito.

## 5. Blocco provider ancora aperto

La lettura più recente del branch restituisce ancora:
- `status = MIGRATIONS_FAILED`
- `preview_project_status = ACTIVE_HEALTHY`

Il database QA è raggiungibile, contiene lo schema atteso e i dati di test esistenti; le migrazioni storiche sono state riprodotte integralmente su PostgreSQL 17 isolato e i tre account reali superano il test di autenticazione/sessione.

Resta da identificare l'errore originale del workflow di creazione/deploy del branch. La documentazione Supabase richiede di aprire **Manage Branches → bethag-launch-qa → View logs** per leggere lo step fallito e il relativo errore PostgreSQL. Il connettore disponibile restituisce lo stato del branch ma non espone il dettaglio dell'action run storico; i log Postgres disponibili nell'intervallo consultabile non contengono l'errore di creazione del 2 novembre.

Non eseguire reset, delete/recreate o rebase alla cieca: il branch contiene fixture QA e la sequenza contiene timestamp QA-specifici successivi ad alcune migrazioni Production. La procedura provider va scelta solo dopo aver letto l'errore originale e verificato l'ordine effettivo.

## Decisione

**Punto 2 resta APERTO, con replay e autenticazione certificati ma stato provider non ancora risolto.**

Nessuna migrazione è stata applicata al QA live durante questa riconciliazione. Produzione non è stata modificata. I dati QA non sono stati cancellati o resettati.

## Prossime attività per chiudere il punto 2

1. Eseguire il collaudo UI di scrittura/persistenza APP-01..APP-12 sul QA live con fixture temporanee a marker univoco e cleanup service-role verificato.
2. Recuperare il messaggio esatto dello step fallito da Supabase Branches → View logs.
3. Applicare esclusivamente la procedura non distruttiva indicata dall'errore, mantenendo i dati QA.
4. Rileggere branch status, ledger, inventario schema e autenticazione dopo la riparazione.
5. Chiudere il punto solo quando provider status e controlli funzionali sono tutti verdi.
