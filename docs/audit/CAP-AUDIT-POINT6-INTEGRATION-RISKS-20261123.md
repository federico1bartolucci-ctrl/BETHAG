# CAP Audit — Punto 6: Rischi di integrazione

Data: 2026-11-23
Stato: valutazione documentata; chiusura formale subordinata al completamento dei punti 3–5 e ai gate di CI delle consolidazioni.

## Rischi e controlli

| Area | Rischio concreto | Mitigazione / evidenza | Stato |
|---|---|---|---|
| package.json | Script di test/build sovrascritti o omessi quando PR sovrapposte vengono integrate | Verificare il diff cumulativo e la presenza di ogni test; #387 ha aggiornato un guard statico obsoleto e CI è in esecuzione | In verifica |
| RegisterPage.tsx | Perdita di query paginate, filtri o gestione errori tra PR stacked | Sequenza cumulativa #328 → #373 → #374 → #375 → #376 → #377 → #378 → #379 → #380; #380 CI Build PASS sullo SHA 301181711c3a6d5f2074ccf943f6ed5c591ad8d7 | CI PASS; integrazione non eseguita |
| AccountingPage.tsx | Conflitti fra scoping workspace, paginazione, query unità/membri e rendiconto | Consolidazioni #387 (membri) e #388 (rendiconto); entrambe toccano AccountingPage.tsx e package.json, quindi non integrare alla cieca o in parallelo | #388 CI PASS; #387 build in corso |
| Helper comuni | Helper condivisi duplicati, API divergenti o cursor/filter behavior incompatibile | Verificare import, chiamanti e test sull'albero cumulativo prima di scegliere una sola implementazione | Da verificare |
| Test di regressione | Test omessi dalla sequenza npm test o guard statici che verificano la vecchia implementazione invece del comportamento | CI di #387 ha riprodotto il fallimento del guard obsoleto; guard aggiornato sul branch. Confermare npm test completo sul nuovo SHA | Baseline Safety PASS; Build in corso |
| PR stacked | Branch figlie basate su head intermedi possono perdere correzioni se integrate fuori ordine o trattate come PR indipendenti | Conservare la sequenza parent/child, controllare base/head e diff cumulativo; non mergeare duplicati o alternative prima della riconciliazione | Controllo documentato; merge non autorizzati |

## CI osservata sui commit esatti

- Register #380 — Build PASS (run 45264444134); Final QA APP-01..APP-15 skipped.
- Accounting Members #387 — Baseline Safety PASS (run 45275991796); Build run 45275991828 in progress al controllo; Final QA skipped.
- Rendiconto #388 — Baseline Safety PASS (run 45274935119), Build PASS (run 45274935368); Final QA skipped.

## Decisione di integrazione

1. Nessun merge automatico.
2. #387 e #388 non devono essere integrati in parallelo: condividono almeno `AccountingPage.tsx` e `package.json`.
3. Prima dell'integrazione, eseguire la riconciliazione cumulativa dei file condivisi, verificando che helper e test siano presenti e che `npm test` sia completo.
4. L'esito Build PASS di #380/#388 non equivale al collaudo autenticato APP né alla verifica su QA/Production.
5. QA e Production restano intatte.

## Limiti

Questo documento chiude la rilevazione e la classificazione dei rischi del Punto 6 come audit documentale. Non certifica la risoluzione di ogni rischio tecnico, né sostituisce i punti 3–5 (ordine d'integrazione e verifiche cumulative) o i gate CI ancora pendenti.
