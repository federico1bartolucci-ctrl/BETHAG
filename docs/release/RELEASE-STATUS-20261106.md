# BETHAG — stato release verificato
**Data verifica:** 2026-11-06  
**Repository:** `federico1bartolucci-ctrl/BETHAG`  
**PR di rilascio:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Branch:** `fix/qa-view-acl-parity-20261105` → `main`  
**Commit applicativo verificato:** `6988383794995748436aaa691e8a08ed41eb8188`

## 1. Evidenze QA aggiornate

Le seguenti esecuzioni GitHub Actions sono associate al commit applicativo indicato e risultano completate con esito SUCCESS:

- [Final QA APP-01..APP-15 — run 42132736491, workflow n. 145](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736491)
- [Build + PostgreSQL bootstrap — run 42132736459, workflow n. 3097](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736459)
- [Baseline Safety — run 42132736537, workflow n. 331](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736537)

Nel job Final QA sono terminati con SUCCESS i passaggi APP-01..04/APP-13, APP-05..07, APP-08..11, APP-12, i flussi browser autenticati e APP-15. APP-15 ha verificato amministratore, collaboratore e condomino, navigazione consentita, restrizioni di ruolo, autenticazione Supabase e persistenza sessione.

APP-12 include preparazione/pubblicazione comunicazioni, webhook sintetici firmati, rifiuto della firma invalida e probe/consegna di messaggi di test tramite Resend. La prova non costituisce certificazione di deliverability su volumi Production.

APP-14 resta PARTIAL perché comprende il cutover e la verifica post-cutover Production, non perché manchi il collaudo applicativo QA.

## 2. Rehearsal e migrazioni

- Clean install: 28 migrazioni provate su PostgreSQL 17 isolato.
- Runner guarded: 19 migrazioni canoniche forward-only provate su database isolato.
- Storico Production da preservare: 248 righe.
- Ledger atteso dopo il cutover: 267 righe.
- Test isolati di ACL, colonna profilo workspace, rollback subentro e permessi collaboratore: PASS.

Nessuna delle 19 migrazioni è stata applicata a Production durante questa verifica.

## 3. Stato live verificato

**Production Supabase** `tctcgptrsmvgajqjgnev`:
- stato ACTIVE_HEALTHY, PostgreSQL 17.6;
- ledger: 248 righe, head `20261104222229`;
- query live read-only del 2026-11-06: confermati database PostgreSQL 17.6, ruolo di lettura `postgres`, 248 righe e head invariato;
- Security Advisor: zero lint; Health Advisor: zero lint;
- preflight read-only documentato PASS;
- Data API: `public` esposto, `private` non esposto, `supabase_functions` non esposto, `graphql_public` aggiuntivo esposto, auto-expose OFF sulla base delle schermate Production fornite il 2026-11-05.

**QA esistente** `jhuyhlzzydcgghrzeexn`:
- branch `bethag-launch-qa` conservato, senza reset o ricreazione;
- stato branch FUNCTIONs_DEPLOYED e preview ACTIVE_HEALTHY secondo l'inventario Supabase;
- ledger letto: 283 righe. Le differenze rispetto alle 248 righe Production sono storiche e già classificate; non pareggiare i conteggi e non riscrivere le identità dei record.

## 4. Divergenze Production già note e coperte dal piano

La Production non è ancora allineata al candidato applicativo. Il report APP-14 documenta, tra l'altro:
- assenza di `workspace_members.data`;
- assenza del trigger/funzione per i metadati dei comproprietari in ingresso;
- controllo dei permessi collaboratore che non tratta correttamente il valore booleano `false`;
- grant EXECUTE mancanti per le implementazioni private previste;
- differenze di default ACL da correggere senza modificare i default provider-managed.

Le correzioni sono già incluse nei 19 payload forward-only congelati. Non è emersa la necessità di aggiungere una ventesima migrazione. Non creare patch speculative e non modificare manualmente il ledger.

Il restore logico locale è stato verificato. Il restore fisico provider-managed non è stato eseguito: il rischio residuo resta esplicito e la precedente accettazione non va descritta come prova di restore fisico.

## 5. Gate ancora aperti per Production

1. L'operatore deve configurare localmente `DATABASE_URL` con connessione PostgreSQL Direct o Session Pooler Production, ruolo `postgres` e privilegi DDL. Password e URI non devono essere incollate in chat, issue, PR o repository. Non resettare la password per aggirare il blocco.
2. Completare il piano operativo: operatore e approvatore nominati, finestra Europe/Rome, freeze schema, comunicazione agli utenti, criteri STOP, rollback/recovery e contatti.
3. Fissare commit e hash dei 19 SQL e ripetere il preflight read-only immediatamente prima del cutover.
4. Solo dopo tutti i gate e l'approvazione formale, eseguire il runner guarded dal checkout approvato.
5. Eseguire postflight (267 righe, 248 storiche intatte, 19 nuove esatte), smoke autenticato Production e comunicazione di chiusura.

## 6. Decisione

**QA applicativo: PASS per APP-01..APP-13 e APP-15.**  
**APP-14: PARTIAL. Production cutover: NO-GO.**

PR #57 resta aperta e non unita. Nessun merge, deploy, migrazione, scrittura ledger o modifica Production è stata eseguita in questa verifica. Non avviare il runner né dichiarare BETHAG pronto al lancio finché i gate sopra non risultano documentati e superati.

Questo documento aggiorna le evidenze al 2026-11-06; non sostituisce il runbook `docs/release/CUTOVER-BETHAG.md`, il freeze SQL o l'approvazione operativa.
