# BETHAG — release reconciliation addendum

**Data:** 2026-11-07  
**PR:** #57 — `fix/qa-view-acl-parity-20261105` → `main`  
**Scopo:** riallineamento documentale e operativo dopo il completamento del collaudo QA.

## 1. Source of truth e candidato verificato

- Ultimo commit applicativo sottoposto a verifica: `a5be3e1dfb8f43d7f7a4e8ff4bc10c87b3fc1f3e`.
- La branch PR #57 risultava a questo SHA al momento della verifica.
- La documentazione storica che riporta SHA precedenti resta conservata come evidenza storica, ma non costituisce approvazione per il candidato corrente.
- L'aggiornamento di questo addendum genera un nuovo commit documentale. Di conseguenza, **lo SHA risultante dovrà essere nuovamente verificato con CI e diventerà il solo candidato valutabile per l'approvazione finale**. Non si riutilizzano approvazioni riferite a SHA precedenti.

## 2. CI e collaudo QA sul candidato applicativo precedente

Sul source SHA `a5be3e1dfb8f43d7f7a4e8ff4bc10c87b3fc1f3e` risultano completati con successo:

- Final QA APP-01..APP-15: run [42335679462](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679462), job `final-qa-collaudo`, attempt finale SUCCESS, nessuno step fallito o saltato.
- Build: run [42335679466](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679466), SUCCESS.
- Baseline Safety: run [42335679476](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42335679476), SUCCESS.

Il primo tentativo Final QA ha avuto un errore transitorio Cloudflare 521 durante cleanup; il job è stato rilanciato e l'ultimo attempt è SUCCESS. Fa fede l'ultimo attempt, non il fallimento transitorio precedente.

APP-12: i test QA/provider documentati confermano invio di messaggi sintetici di test e ricezione degli eventi provider per il destinatario di test. Non è una certificazione di deliverability di massa o di tutti i template Production, né prova di invii a condomini reali.

APP-14: resta **PARTIAL / POST-CUTOVER**. Il collaudo applicativo QA è completato, ma la verifica ACL/schema sul database Production dopo l'applicazione delle migrazioni non può essere dichiarata PASS prima del cutover e del postflight. Non confondere PASS QA con parità Production.

## 3. Migrazioni: congelamento immutato

Il file `supabase/rebuild/production-migration-cutover-freeze-20261105.json` resta l'artefatto congelato della sequenza di 19 migrazioni e dei rispettivi Git blob SHA. Non modificarne l'ordine, i payload o gli hash per risolvere discrepanze documentali.

La verifica read-only Production più recente disponibile in questa sessione ha rilevato:
- database PostgreSQL 17.6;
- ledger: 248 righe;
- head: `20261104222229`;
- Security Advisor: zero lint;
- Health Advisor: zero lint.

Il target post-cutover resta 267 righe: 248 storiche intatte + 19 nuove righe esatte. La verifica live del ledger non dimostra che le 19 migrazioni siano state applicate: **non sono state applicate**.

## 4. Approvazioni e finestra: invalidazione esplicita

La precedente approvazione finale registrata nel testo PR era riferita allo SHA `b029d991c396a5b1fccbbf9b71c0685ddb72a721`, non al candidato `a5be3e1...` e non al nuovo commit documentale che verrà generato da questo addendum.

Pertanto:
- la precedente approvazione è **non valida per qualsiasi esecuzione sul candidato attuale**;
- la finestra precedentemente indicata 7 novembre 2026, 22:00–8 novembre 2026, 02:00 Europe/Rome è da considerarsi scaduta/da riconfermare prima di un eventuale cutover;
- l'eventuale approvazione successiva dovrà indicare il nuovo SHA completo, i 19 hash ordinati, il rischio residuo backup, l'operatore, la finestra e i criteri STOP/recovery.

## 5. Stato ambienti e divieti

- Production Supabase `tctcgptrsmvgajqjgnev`: nessuna modifica eseguita in questa attività.
- Nessun merge della PR #57.
- Nessun deploy.
- Nessuna migrazione Production applicata.
- Nessuna modifica al ledger Production.
- Nessun freeze operativo attivato.
- Restore fisico provider-managed non testato; il restore logico locale verificato non deve essere descritto come restore fisico.

## 6. Gate residui

1. Attendere il nuovo SHA prodotto dal commit documentale e verificare CI completa su quel preciso candidato.
2. Verificare che il freeze dei 19 payload SQL e i rispettivi blob SHA siano ancora identici al candidato.
3. Eseguire preflight Production esclusivamente read-only, incluso controllo aggiornato di ledger, ACL, RLS, ruoli/default privileges e configurazione effettiva Data API nella Dashboard.
4. Riconfermare connessione PostgreSQL diretta/Session Pooler, operatore, finestra e piano STOP/recovery.
5. Ottenere nuova approvazione scritta del proprietario riferita allo SHA finale e ai 19 hash.
6. Solo dopo tutti i gate, valutare separatamente merge, deploy e cutover. Ogni azione resta subordinata alla sua specifica autorizzazione.
7. Dopo l'applicazione: postflight, 267 righe con storico invariato, ACL/RLS, smoke autenticati Production e chiusura APP-14.

## Decisione

**QA applicativo sul candidato `a5be3e1...`: PASS.**  
**Documentazione storica: conservata, ma superata da questo addendum per lo stato corrente.**  
**Production cutover: NO-GO fino alla nuova certificazione sullo SHA documentale finale, al preflight aggiornato e a una nuova approvazione esplicita.**

Questo addendum è la fonte di verità per lo stato di rilascio dal momento del suo commit. Non autorizza modifiche a Production.


## 7. Manifest approval guard — riallineamento completato

Dopo la prima stesura di questo addendum, il manifest congelato è stato aggiornato esclusivamente nei metadati di approvazione:
- `status` impostato a `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`;
- precedente autorizzazione conservata in `superseded_user_authorization` solo come traccia storica;
- `user_authorization` corrente impostata a `PENDING`, senza SHA approvato, approvatore, timestamp o hash approvati;
- sequenza, ordine e tutti i 19 `git_blob_sha` SQL lasciati invariati.

Questo riallineamento è necessario anche come salvaguardia eseguibile: il runner guarded non può interpretare la vecchia autorizzazione come consenso valido per il candidato attuale. La nuova approvazione dovrà essere registrata nel manifest soltanto dopo il completamento dei gate sullo SHA finale.
