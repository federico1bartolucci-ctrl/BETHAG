# BETHAG — audit complessivo APP-14 / Production cutover
**Data:** 2026-11-05  
**Branch:** `fix/qa-view-acl-parity-20261105`  
**Production:** `tctcgptrsmvgajqjgnev`  
**QA di riferimento:** `jhuyhlzzydcgghrzeexn`  
**Esito:** **NO-GO al cutover**, con preflight read-only superato.

## 1. Perimetro e metodo

Audit ricomposto in un'unica verifica di dipendenze, non in controlli isolati. Sono state confrontate le evidenze live disponibili su Production con il ledger congelato, i 19 payload SQL approvati, gli script preflight/postflight, il runner guarded, il report di parità QA/Production e i risultati CI del collaudo QA.

Sono state eseguite esclusivamente letture su Production. Il preflight SQL è stato eseguito come blocco `DO` read-only. **Nessun DDL, DML, GRANT/REVOKE, modifica del ledger, deploy, merge o cutover Production è stato eseguito.**

Limite di accesso: l'elenco dei progetti restituito dal connettore Supabase in questa sessione include Production ma non il progetto QA. Le evidenze QA di parità sono quindi quelle documentate nel report QA/Production e nei workflow CI; non si dichiara una nuova scansione cataloghi QA in questo audit.

## 2. Stato live Production accertato

| Area | Evidenza | Esito |
|---|---|---|
| Progetto | ACTIVE_HEALTHY, PostgreSQL 17.6.1.166, eu-central-1 | PASS |
| Ledger migrazioni | 248 righe; head `20261104222229_reconcile_production_acl_least_privilege` | PASS |
| Confronto ledger congelato | 248/248 coppie versione/nome identiche a `production-ledger-20261105.json` | PASS |
| Relazioni public | 48 oggetti: 47 tabelle/partizioni e una view | PASS |
| MAINTAIN corrente | 0 relazioni per authenticated; 0 per service_role | PASS |
| Security Advisor | 0 lint | PASS |
| Schema private | USAGE presente per authenticated e service_role | PASS |
| Colonna `workspace_members.data` | Assente | FAIL applicativo atteso |
| Trigger co-owner | `trg_apply_incoming_transfer_member_metadata` assente; funzione privata assente | FAIL applicativo atteso |
| Permessi collaboratore | Entrambe le funzioni private usano la sola presenza della chiave JSONB, non il valore booleano `true` | FAIL sicurezza applicativa |
| RPC private authenticated | 18 implementazioni private previste dal piano senza EXECUTE authenticated; anche il helper privato transfer-closure non ha EXECUTE authenticated/service_role | FAIL ACL applicative |
| Default ACL provider | Tre default MAINTAIN intestati a `supabase_admin` restano presenti | Eccezione provider documentata; non modificare |

Le due funzioni collaboratore installate in Production sono state lette direttamente. La condizione corrente `permissions ? required_permission` può considerare autorizzata una chiave presente con valore JSON booleano `false`. La migrazione congelata `20261028100000_fix_collaborator_module_permission_boolean.sql` sostituisce tale controllo con il test esplicito del valore `true` e conserva il formato legacy array.

Le 18 implementazioni private e il helper transfer-closure sono distinti dai wrapper public. Il piano contiene già le correzioni di grant necessarie: migrazione `20261104130000_reconcile_qa_security_and_coowner_rpcs.sql` per i 18 RPC e `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql` per il helper transfer-closure. Il postflight è stato rafforzato per verificare sia authenticated sia service_role sul helper.

## 3. Dashboard Data API — verifica manuale completata

Le schermate Production fornite dall'operatore mostrano:

- `public` esposto;
- `private` non esposto;
- `graphql_public` esposto (registrato come schema aggiuntivo; non è uno dei due criteri di blocco definiti nel piano);
- `supabase_functions` assente dall'elenco degli schemi selezionati;
- 0/48 tabelle e 0/171 funzioni esposte individualmente;
- `Automatically expose new tables` ora OFF, confermato dalla schermata delle 15:37.

**Gate Dashboard Data API: PASS sulla base delle schermate dell'operatore.** La schermata iniziale mostrava il toggle ON; la seconda attesta la modifica a OFF. Non è stata eseguita alcuna modifica dal connettore o dal codice.

## 4. Piano migrazioni e coerenza degli script

Il freeze `production-migration-cutover-freeze-20261105.json` resta immutato. La sequenza contiene 19 incrementi forward-only, con hash SQL congelati, senza baseline e senza riscrittura delle 248 righe storiche. Il rehearsal PostgreSQL 17 isolato 248+19 è documentato come PASS (run 42017349811), con ledger finale atteso a 267.

La sequenza copre i difetti live identificati:
1. ACL private/execute e default ACL;
2. wrapper transfer e relativo percorso private;
3. revoca MAINTAIN e privilege strutturali;
4. boolean collaborator permissions;
5. colonna `workspace_members.data`;
6. conservazione dello stato archivio;
7. co-owner metadata trigger;
8. grant delle 18 implementazioni private;
9. hardening funzioni trigger;
10. default ACL di tabelle, funzioni e sequenze;
11. upsert centralizzato registrazione portale.

### Correzioni apportate agli strumenti di verifica

- Il preflight ora controlla anche che le due funzioni collaboratore presentino proprio la logica Production pre-cutover attesa, che i 18 grant privati siano ancora assenti, che il helper transfer-closure sia nello stato ACL previsto e che lo schema private abbia USAGE per i ruoli attesi.
- Il primo controllo statico della condizione collaboratore è stato corretto per riconoscere la forma realmente installata `coalesce(wm.permissions, ... ) ? required_permission`; non era un difetto applicativo né un cambiamento Production.
- Il preflight aggiornato è stato eseguito su Production e non ha sollevato eccezioni: **PREFLIGHT PASS** per gli invarianti read-only definiti.
- Il postflight ora dichiara correttamente 19 incrementi (non 16) e verifica anche EXECUTE service_role sul helper transfer-closure.

Il preflight SQL verifica inventario, head/count ledger, assenza delle 19 versioni pendenti, ACL e precondizioni note. La comparazione esatta di tutte le 248 coppie versione/nome è inoltre verificata dal runner guarded contro lo snapshot congelato; la comparazione live eseguita in questo audit ha confermato 248/248 corrispondenze.

## 5. Gate APP-14 complessivi

| Gate | Stato | Motivo / evidenza |
|---|---|---|
| Data API Dashboard | PASS | Screenshot Production; toggle OFF e schemi verificati |
| Ledger Production | PASS | 248/248 coppie esatte; head invariato |
| Rehearsal 19 migrazioni | PASS | PostgreSQL 17 isolato, run 42017349811 |
| QA APP-01–APP-15 | PASS | CI completo; provider Resend/webhook QA verificati |
| Security Advisor Production | PASS | 0 lint; non sostituisce i test funzionali |
| Preflight read-only Production | PASS | Eseguito dopo il rafforzamento degli assert |
| Restore fisico provider | RISCHIO ACCETTATO, NON TESTATO | Restore logico locale verificato; backup fisico non ripristinato; rischio già accettato nel freeze |
| `DATABASE_URL` PostgreSQL diretto | BLOCCATO | Non disponibile tramite connettore; serve URI direct/Session Pooler con ruolo postgres e password reperita localmente |
| Piano operativo finale | BLOCCATO | Mancano commit finale pinned dopo CI, finestra manutenzione Europe/Rome, avviso utenti, operatore, criteri STOP e rollback/contatti |
| Applica 19 migrazioni | NON ESEGUITO | Richiede tutti i gate e avvio cutover esplicito |
| Postflight Production | NON ESEGUIBILE ORA | Deve seguire l'applicazione controllata |
| Smoke autenticato Production | NON ESEGUITO | Da eseguire dopo postflight senza alterare dati reali |

## 6. Conclusione tecnica

APP-14 non è bloccato da un singolo toggle o da un generico errore di CI. Il quadro è composto da divergenze applicative e ACL note e già coperte dalla sequenza di 19 migrazioni, più due prerequisiti operativi ancora mancanti: connessione PostgreSQL diretta e piano di manutenzione/rollback approvato.

**Non emerge, dalle letture effettuate, la necessità di inventare una ventesima migrazione.** Le correzioni per boolean permissions, co-owner trigger, colonna profilo, grant RPC, helper transfer-closure e portal upsert sono già rappresentate nei 19 payload congelati. Il punto decisivo è applicarli solo con il runner guarded, dopo avere ottenuto la connessione locale e completato il piano operativo.

La schermata Data API e il preflight PASS non autorizzano da soli il cutover. Production resta **NO-GO** fino alla chiusura dei gate operativi. Nessuna modifica remota è stata eseguita durante questo audit.
