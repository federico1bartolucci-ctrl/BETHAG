# CAP consolidation — punti 4–8: verifica cumulativa e chiusura

Data: 2026-11-24  
SHA tecnico verificato: `cb202da730000f5cbf631966841812c5bf8e662c`  
PR di consolidamento: [#389](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/389)

## Punto 4 — conflitti cumulativi

**ESITO: CHIUSO sullo SHA tecnico indicato.**

- Confronto GitHub tra `main` e `cap-consolidation-20261123`: 25 commit ahead / 5 behind; merge base `29ae2870618069e59c21c0c1ae5c642be2f1ca1b`.
- I cinque commit presenti solo su `main` modificano esclusivamente `.github/workflows/qa-final-collaudo.yml`.
- Il contenuto di tale workflow è stato confrontato tra `main` e CAP ed è risultato identico al momento della verifica.
- GitHub ha riportato PR #389 `mergeable: true`.
- Nessun conflitto testuale residuo è stato rilevato nel confronto esaminato.

La chiusura riguarda la riconciliazione dei conflitti sullo SHA indicato; non autorizza merge. Ogni modifica successiva al workflow o al branch richiede un nuovo confronto.

## Punto 5 — adeguamento test e script

**ESITO: CHIUSO sullo SHA tecnico indicato.**

Lo script `npm test` esegue in sequenza:
1. `scripts/test-clean-bootstrap.mjs`
2. `scripts/test-admin-membership-pagination.mjs`
3. `scripts/test-workspace-pagination-cap.mjs`
4. `scripts/test-register-sal-work-local-date.mjs`
5. `scripts/test-member-transfer-close-scope.mjs`

Il workflow Build ha completato con successo lo step `npm test` sullo SHA tecnico indicato (run 45387686747). I test aggiunti e i relativi helper risultano quindi inclusi nella suite eseguita.

## Punto 6 — test cumulativi

**ESITO: CHIUSO sullo SHA tecnico indicato.**

Nel run Build 45387686747 sono risultati SUCCESS:
- test automatici `npm test`;
- build Vite;
- bootstrap PostgreSQL 17 su database isolato;
- rehearsal cronologico delle 28 migrazioni clean-install;
- rehearsal delle 19 migrazioni canoniche tramite runner guarded su database isolato;
- controlli ACL/security, rollback del trasferimento e vincoli permessi collaboratore;
- smoke browser pubblico isolato.

Questi risultati certificano i test e i rehearsal isolati, non l'applicazione delle migrazioni su Production.

## Punto 7 — CI consolidata

**ESITO: CHIUSO sullo SHA tecnico indicato.**

I tre workflow richiesti hanno concluso SUCCESS sullo stesso SHA:
- Build / PostgreSQL 17: [45387686747](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45387686747)
- Baseline Safety: [45387686644](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45387686644)
- Final authenticated QA: [45387686799](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45387686799)

La run QA è associata esattamente a `cb202da730000f5cbf631966841812c5bf8e662c`. Tutti e tre i workflow sono terminati con conclusion `success`.

## Punto 8 — regressioni

**ESITO: CHIUSO sullo SHA tecnico indicato.**

La suite `npm test` include regressioni dedicate a:
- paginazione delle membership admin prima della cancellazione account;
- limite/cap della paginazione workspace;
- data locale nel registro SAL;
- collisione tra ID membro uguali in condomini differenti durante la chiusura trasferimento;
- clean bootstrap.

Il test del trasferimento riproduce due membri con lo stesso ID numerico in condomini differenti e verifica che venga archiviato soltanto il membro del condominio interessato; verifica inoltre il comportamento fail-closed quando manca lo scope. Il test è incluso in `npm test`.

La chiusura attesta l'esecuzione della suite sullo SHA indicato; non equivale a una certificazione di ogni possibile scenario di produzione.

## Limiti e stato non modificato

- QA autenticato APP-01..APP-13 e APP-15: PASS nel run 45387686799.
- Il probe di invio live Resend è stato esplicitamente escluso dal run QA; nessuna email esterna è stata inviata in quel run. I webhook sintetici e la preparazione destinatari sono stati testati.
- APP-14 / cutover e smoke autenticati Production: non eseguiti in questo collaudo; Production resta NO-GO.
- Nessuna migrazione, DDL, DML, modifica ACL, deploy o merge Production eseguito.
- PR #389 resta Draft.

## Effetto della presente registrazione

Questo verbale è documentazione di audit aggiunta dopo il collaudo tecnico sullo SHA `cb202da730000f5cbf631966841812c5bf8e662c`. Non modifica codice applicativo, workflow, SQL, manifest congelato o dati QA/Production. Il commit documentale risultante non eredita automaticamente la certificazione exact-head: la CI eventualmente avviata sul nuovo head deve essere letta separatamente.
