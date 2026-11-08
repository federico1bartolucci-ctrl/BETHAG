# BETHAG — verifica finale parità QA / Production
**Data:** 2026-11-05  
**QA:** branch Supabase esistente `bethag-launch-qa`, ref `jhuyhlzzydcgghrzeexn`  
**Production:** `tctcgptrsmvgajqjgnev`  
**Ambito:** esclusivamente letture e confronto; nessuna scrittura remota.

## Esito

<badge color="danger">NO-GO Production</badge>

La struttura relazionale di base, RLS, policy, indici e vincoli sono sostanzialmente allineati, ma sono presenti differenze applicative rilevanti: una colonna usata dal codice manca in Production; un trigger di metadata comproprietari esiste solo in QA; sette definizioni di funzioni private differiscono; diciannove implementazioni private hanno EXECUTE authenticated in QA ma non in Production; le funzioni di autorizzazione collaboratori in Production trattano un valore booleano `false` come permesso concesso. Queste condizioni impediscono di certificare la parità applicativa e rendono Production non rilasciabile con il codice QA corrente.

## 1. Componenti allineati

| Controllo | QA | Production | Esito |
|---|---:|---:|---|
| Relazioni public (tabelle, partizioni, viste) | 48 | 48 | Identiche per nome, tipo, owner, ACL e flag RLS |
| Policy RLS public | 103 | 103 | 103/103 identiche per definizione, ruoli, comando e condizioni |
| Indici public | 257 | 257 | 257/257 identici |
| Vincoli public | 305 | 305 | 305/305 identici |
| Edge Functions | 7 | 7 | Tutti i file index.ts confrontati byte-identici |
| Security Advisor | 0 lint | 0 lint | Nessun finding di sicurezza |

Gli hash/versioni di deploy delle Edge Functions sono diversi, ma il contenuto dei sette file `index.ts` restituiti dal provider è identico. Non si deve interpretare la sola differenza di versione o `ezbr_sha256` come differenza di sorgente.

## 2. Divergenze schema e trigger

### 2.1 Colonna mancante in Production — bloccante

`public.workspace_members.data`:
- QA: `jsonb NOT NULL DEFAULT '{}'::jsonb`.
- Production: colonna assente.

Il codice attuale usa il campo per i profili collaboratore:
- `src/lib/bethagBackend.ts` legge `row.data.name` e `row.data.email` (intorno alla riga 396);
- la sincronizzazione scrive `data: { name, email, status }` su `workspace_members` (intorno alla riga 665).

Con lo schema Production attuale, la sincronizzazione può fallire per colonna inesistente e i dati profilo non possono essere letti/scritti come previsto. La migrazione QA-only `20261102054409_add_workspace_member_profile_data` è nel ledger QA ma non in Production.

Draft forward-only preparato, non applicato: `supabase/rebuild/drafts/20261105040000_add_workspace_member_profile_data.sql`. Il test isolato verifica righe esistenti, default per nuove righe e idempotenza; non modifica ambienti remoti.

### 2.2 Trigger co-owner assente in Production — bloccante per il flusso interessato

- QA: 147 trigger applicativi su relazioni public.
- Production: 146.
- Trigger QA-only: `trg_apply_incoming_transfer_member_metadata` BEFORE INSERT su `public.condominium_members`.
- Funzione QA-only: `private.apply_incoming_transfer_member_metadata()`, SECURITY INVOKER, search_path vuoto.
- Production non contiene né la funzione né il trigger.

La migrazione QA-only `20261103193927_qa_store_incoming_coowner_profile_metadata` è conservata nello snapshot dei payload. Il flusso di inserimento dei comproprietari in ingresso non può essere considerato equivalente in Production finché questo trigger non viene portato con una migrazione forward-only verificata.

## 3. Divergenze funzioni e autorizzazioni — bloccanti

### 3.1 Funzioni private

Inventario:
- QA: 173 funzioni applicative public/private.
- Production: 171.
- Due funzioni presenti solo in QA: `private.apply_incoming_transfer_member_metadata()` e `private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)`.
- Sette definizioni comuni hanno hash differenti:
  1. `private.admin_approve_portal_registration`
  2. `private.archive_condominium`
  3. `private.can_access_workspace_module`
  4. `private.can_manage_workspace_module`
  5. `private.complete_portal_registration`
  6. `private.restore_condominium`
  7. `private.save_condominium`

Le differenze riguardano logica di autorizzazione, registrazione portale e conservazione dei metadati di archivio; non sono semplici differenze di formattazione.

### 3.2 Bug di autorizzazione collaboratori in Production — criticità alta

QA usa la migrazione canonica `20261028100000_fix_collaborator_module_permission_boolean`: per permessi JSONB a oggetto richiede che il valore sia esattamente `true`; continua a supportare il formato legacy ad array.

Production conserva la logica precedente:
- `permissions ? required_permission` verifica la sola presenza della chiave;
- un oggetto `{"condomini": false}` viene quindi interpretato come permesso presente e può autorizzare l'operazione.

È un difetto di autorizzazione, non soltanto una differenza funzionale. Il test isolato già presente in CI verifica i tre casi: false = DENIED, true = ALLOWED, assente = DENIED. La riga di migrazione è presente in QA e assente dal ledger Production.

### 3.3 EXECUTE authenticated mancante su implementazioni private

Il confronto dei privilegi effettivi rileva **19 funzioni private** per le quali authenticated ha EXECUTE in QA ma non in Production:

- `admin_approve_portal_registration`
- `archive_condominium`
- `check_condominium_member_transfer_closure`
- `claim_first_workspace_admin`
- `close_condominium_fiscal_year`
- `close_fiscal_year_and_generate_carryovers`
- `compensate_fiscal_carryover`
- `complete_portal_registration`
- `confirm_condominium_creation_intake`
- `delete_condominium`
- `generate_fiscal_year_carryovers`
- `generate_installments_from_allocations`
- `generate_installments_from_allocations_schedule`
- `list_archived_condominiums`
- `register_condominium_installment_payment`
- `restore_condominium`
- `reverse_condominium_installment_payment`
- `set_personal_security_code`
- `verify_personal_security_code`

I wrapper pubblici campionati (`public.archive_condominium`, `public.close_condominium_fiscal_year`, `public.save_condominium`) sono SECURITY INVOKER e delegano alle implementazioni private. Senza EXECUTE sulla funzione privata, il chiamante authenticated può ricevere un errore di privilegio anche se il wrapper pubblico è eseguibile. Il codice client usa direttamente RPC per queste operazioni (fra gli altri, `src/lib/bethagBackend.ts`, `src/AccountingPage.tsx`, `src/main.tsx`).

La lista non va risolta con un GRANT indiscriminato: prima vanno allineate le definizioni QA/Production per le sette funzioni diverse e verificati i controlli auth/modulo di ciascuna implementazione.

### 3.4 EXECUTE PUBLIC sulle funzioni trigger

Production mantiene EXECUTE PUBLIC/anon/authenticated sulle due funzioni trigger `public.normalize_zero_ownership_owner()` e `public.preserve_closing_condominium_member_history()`; QA lo ha revocato. Entrambe restituiscono `trigger`, non sono SECURITY DEFINER e non sono normali funzioni invocabili come RPC. Il draft forward-only di hardening è stato provato due volte su PostgreSQL 17 isolato, preservando owner/service_role. Non applicato in remoto.

## 4. ACL, viste e default privileges

- La view `public.condominium_fund_availability` ha privilegi effettivi allineati: anon SELECT no; authenticated e service_role SELECT sì; MAINTAIN no per entrambi.
- Le default ACL di tabelle, funzioni e sequenze restano diverse fra QA e Production. I tre draft forward-only del punto 5 sono stati testati due volte in PostgreSQL 17 isolato con rollback e sentinel `supabase_admin` invariato; non sono stati applicati.
- Il confronto di relazioni conferma ACL correnti e flag RLS uguali per i 48 oggetti public; la differenza di default ACL riguarda gli oggetti futuri creati da postgres e non contraddice la parità delle ACL correnti.

## 5. Estensioni e advisor

- QA ha `pg_net 0.20.4` in schema extensions; Production non lo ha.
- Nessuna funzione applicativa nei cataloghi public/private fa riferimento a `net.http_*` o `pg_net`; non è stata trovata dipendenza SQL diretta. È una differenza d'ambiente da documentare, non autorizza a installare/rimuovere estensioni.
- Security Advisor: zero lint in entrambi.
- Performance Advisor: QA 35 indici inutilizzati, Production 60; entrambi 21 policy permissive multiple e un finding informativo sul limite connessioni Auth. Gli indici inutilizzati dipendono anche dal diverso carico e non vanno rimossi in questa fase.

## 6. Edge Functions e configurazione Data API

- Tutte le sette Edge Functions sono ACTIVE in entrambi i progetti e i rispettivi file `index.ts` sono identici byte per byte; le versioni provider differiscono.
- QA: la schermata Dashboard acquisita il 2026-11-05 attesta `Automatically expose new tables = OFF`.
- Production: il valore di questa impostazione non è esposto dalle funzioni Supabase attualmente disponibili né dai GUC PostgreSQL interrogabili. Deve essere verificato manualmente nella Dashboard prima di un eventuale GO. Non viene assunto che il valore QA sia ereditato.

## 7. Gate di rilascio

| Gate | Stato |
|---|---|
| Schema relazionale / RLS / policy / indici / vincoli | PASS, salvo colonna workspace_members.data |
| Autorizzazioni collaboratori | **FAIL** — bug booleano presente in Production |
| RPC authenticated | **FAIL** — 19 implementazioni private senza EXECUTE rispetto a QA |
| Logica archivio e portale | **FAIL** — sette definizioni private divergenti, inclusi save/archive/restore e registrazione |
| Metadati comproprietari | **FAIL** — funzione e trigger presenti solo in QA |
| Trigger EXECUTE PUBLIC | **FAIL** — Production da harden |
| Default ACL future | DRAFT testati, non applicati |
| Edge Functions | PASS, sorgenti identiche |
| Security Advisor | PASS, zero lint |
| Data API auto-expose Production | NON VERIFICATO manualmente |
| APP-01–APP-15 | NON ESEGUITO; riservato alla fase finale |

**Decisione:** Production NO-GO. Non effettuare merge, deploy, migrazioni, GRANT/REVOKE o ALTER remoti. Per un futuro GO occorre una sequenza di migrazioni forward-only, basata sulle definizioni e payload QA verificati, testata su PostgreSQL isolato, poi autorizzata separatamente prima dell'applicazione a Production.

## 8. Salvaguardie

Durante questa verifica:
- solo SELECT sui due database;
- Production ledger confermato a 248 righe e QA a 283;
- nessun dato applicativo modificato;
- nessuna migrazione applicata;
- QA esistente `bethag-launch-qa` mantenuto, nessun branch aggiuntivo creato;
- APP-01–APP-15 non avviato in questa fase.


## 9. QA branch provider status and additive column rehearsal

Supabase branch metadata read on 2026-11-05:
- `bethag-launch-qa`: `FUNCTIONS_DEPLOYED`, preview project `ACTIVE_HEALTHY`.
- `main`: `FUNCTIONS_DEPLOYED`, preview project `ACTIVE_HEALTHY`.
- No additional QA branch exists; no branch was created or deleted.

The additive draft for `workspace_members.data` was tested on isolated PostgreSQL 17 with an old-schema fixture containing an existing collaborator row. The draft was applied twice; existing row retained and received `{}`, new rows received the same default, the column was verified JSONB NOT NULL, and the transaction rolled back. Build run [41950916265](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41950916265) and baseline safety run [41950916285](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41950916285) both **SUCCESS** on commit `19d951c936023899fb1b2564fc20a4ff0becc5be`.

## 10. Decisione finale punto 6

Il punto 6 è completato come verifica e preparazione dei gate con esito **NO-GO Production**. La decisione è basata su divergenze effettive e riproducibili, non su un generico mancato allineamento dei registri. Le correzioni sono state predisposte o individuate come migrazioni forward-only, ma nessuna è stata applicata agli ambienti remoti.

La verifica manuale della Dashboard Production per `Automatically expose new tables` resta un gate non attestato; il valore QA è OFF. Anche se la verifica manuale risultasse OFF, i blocker applicativi e di autorizzazione sopra elencati manterrebbero Production NO-GO.


## 11. Stato collaudo applicativo QA aggiornato — 2026-11-05

Il collaudo finale sul progetto QA esistente `jhuyhlzzydcgghrzeexn` è stato completato dopo la presente verifica di parità:
- Final QA collaudo [run 42035330794](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42035330794): **SUCCESS**.
- Build [run 42035330772](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42035330772): **SUCCESS**.
- Baseline safety [run 42035330822](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42035330822): **SUCCESS**.
- APP-01–APP-13 e APP-15: **PASS**. APP-12 include invio tramite Resend al destinatario sintetico `delivered@resend.dev`, callback provider firmato ricevuto dal webhook QA dedicato e persistenza verificata di `provider_message_id`, `sent_at`, `provider_event_id`, `delivered_at`, stato `delivered` e aggregato `Consegnata`.
- APP-14: **PARTIAL** per i gate di cutover e parità Production ancora aperti.

Questo esito QA non modifica né risolve le divergenze Production descritte nelle sezioni precedenti. In particolare restano bloccanti la colonna `workspace_members.data` assente in Production, il trigger e la funzione co-owner QA-only, le sette definizioni private divergenti, i 19 privilegi EXECUTE mancanti, il bug booleano dei permessi collaboratori e il controllo Dashboard Production Data API non attestato.

**Decisione invariata: Production NO-GO.** Nessuna migrazione, modifica ACL, deploy, merge o cutover Production è stata eseguita dal collaudo QA. Il completamento di APP-01–APP-13 e APP-15 non equivale all'autorizzazione del rilascio Production.


## 12. Aggiornamento collaudo finale QA — run 42040560319

Il workflow [BETHAG final QA collaudo 42040560319](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42040560319) è terminato **SUCCESS** sul commit `7e308fb976245228f693a9ce17be6d2b27cd8e1a`. Il job `final-qa-collaudo` e tutti i suoi step, inclusi cleanup e teardown, risultano `completed / success`.

Evidenze step-by-step:
- APP-01..04 e APP-13 — real-auth RLS e Storage: SUCCESS.
- APP-05..07 — condominium, accounting e closed-period guard: SUCCESS.
- APP-08..11 — transfer, unpaid positions e rollback invariants: SUCCESS.
- APP-09 — member e unit carryover blockers: SUCCESS.
- APP-12 — publication, recipient preparation e signed webhook events: SUCCESS.
- APP-12 — probe del provider email distribuito tramite Resend con destinatario sintetico `delivered@resend.dev`: SUCCESS.
- APP-05/06/08/11/12 — authenticated browser UI workflows: SUCCESS.
- APP-15 — role navigation e session persistence: SUCCESS.
- Stop QA preview e teardown Deno/Node/checkout: SUCCESS.

**Esito aggiornato:** APP-01–APP-13 e APP-15 PASS sul QA esistente. Gli stati precedenti APP-11 PARTIAL e APP-12 PARTIAL sono superati da questo run completo. APP-14 resta PARTIAL / NO-GO Production.

Il risultato del collaudo QA non rimuove i blocker Production già descritti in questo report: colonna `workspace_members.data` assente, trigger/funzione co-owner mancanti, definizioni private divergenti, privilegi EXECUTE mancanti, bug booleano dei permessi collaboratore e verifica manuale Data API Production non attestata. Non è stato eseguito alcun merge, deploy, DDL o cutover Production; nessun ambiente QA aggiuntivo è stato creato.


## 13. Riconferma collaudo QA e confronto live autorizzazioni — 2026-11-05

La nuova esecuzione del collaudo sul commit `93f23d95108cba8b4c791fc7a3c99b21cb27799e` è terminata SUCCESS:
- Final QA [42043452669](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452669): SUCCESS, APP-01–APP-15 PASS.
- Build [42043452826](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452826): SUCCESS.
- Baseline safety [42043452653](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452653): SUCCESS.

È stato ripetuto in sola lettura il confronto live delle definizioni di `private.can_access_workspace_module(uuid,text)` e `private.can_manage_workspace_module(uuid,text)`:
- QA: entrambe supportano il formato legacy JSONB array e il formato JSONB object; per gli object richiedono che il valore della chiave sia esattamente `true`, altrimenti negano.
- Production: entrambe usano ancora il controllo di sola presenza della chiave JSONB (`permissions ? required_permission`), senza verificare che il valore sia `true`. Un oggetto con valore booleano `false` può quindi essere trattato come autorizzato.

La divergenza è confermata sulle definizioni effettivamente installate, non dedotta dal solo ledger. Restano inoltre confermate in Production l'assenza di `public.workspace_members.data` e del trigger `trg_apply_incoming_transfer_member_metadata`.

**Decisione invariata: NO-GO Production.** Nessuna query di scrittura, migrazione, GRANT/REVOKE, deploy o cutover è stata eseguita. PR #57 resta aperta e non unita.


## 14. Audit APP-14 consolidato e verifica Dashboard Production — 2026-11-05

Il report `docs/release/APP14-COMPREHENSIVE-AUDIT-20261105.md` consolida il controllo live Production, la sequenza congelata e i gate operativi.

La precedente nota "Data API auto-expose Production: NON VERIFICATO manualmente" è superata dalle schermate successive dell'operatore:
- `public` esposto;
- `private` non esposto;
- `graphql_public` esposto come schema aggiuntivo;
- `supabase_functions` non selezionato/non presente nell'elenco;
- 0/48 tabelle e 0/171 funzioni esposte individualmente;
- `Automatically expose new tables` OFF, schermata delle 15:37.

Il gate Dashboard Data API è **PASS sulla base delle schermate**. La presenza di `graphql_public` è documentata e non costituisce uno dei criteri di blocco espliciti del piano corrente.

Nuove letture Production hanno confermato:
- ledger 248/248 coppie versione/nome identiche allo snapshot congelato, head `20261104222229`;
- 47 tabelle/partizioni + una view;
- MAINTAIN effettivo zero per authenticated e service_role;
- Security Advisor zero lint;
- `workspace_members.data` assente;
- trigger/funzione co-owner assenti;
- funzioni collaborator ancora con il controllo booleano difettoso;
- 18 grant EXECUTE authenticated sulle implementazioni private mancanti e helper transfer-closure privato non eseguibile da authenticated/service_role.

Il preflight read-only aggiornato è stato eseguito su Production senza eccezioni. È stato esteso per controllare le precise precondizioni collaborator, i 18 grant privati, il helper transfer-closure e lo schema private. Il postflight è stato corretto per indicare 19 migrazioni e verificare anche il grant service_role sul helper transfer-closure. Il freeze JSON resta immutato.

La sequenza dei 19 payload già congelati copre le divergenze rilevate; non è stata individuata la necessità di una ventesima migrazione. Restano aperti la connessione PostgreSQL diretta locale, il piano operativo finale e l'approvazione del cutover. **Production resta NO-GO; nessuna scrittura, migrazione, merge o deploy è stata eseguita.**
