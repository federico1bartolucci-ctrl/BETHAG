# CAP Audit — Punto 7: Decisioni operative per le fasi successive

Data: 2026-11-23
Stato: chiuso come decisione operativa documentata; applicazione delle decisioni subordinata ai gate tecnici e all'autorizzazione all'integrazione.

## Regole vincolanti

1. **No merge automatici.** Tutte le PR restano draft finché l'ordine d'integrazione, la matrice file-per-file, i test cumulativi e i gate sono verificati.
2. **No integrazione fuori ordine delle PR stacked.** Prima di integrare una figlia, confermare la base, gli SHA e che i cambiamenti delle parent siano inclusi.
3. **No chiusura di PR solo perché duplicata.** Chiudere/abbandonare una PR soltanto dopo aver verificato che codice e regressioni siano assorbiti dalla soluzione scelta.
4. **Non sovrascrivere test o package scripts.** Riconciliare `package.json` e suite `npm test` sul diff cumulativo; verificare che ogni regressione pertinente sia eseguita.
5. **Consolidare per gruppi coerenti.** Preferire un'unica soluzione cumulativa per Register, Accounting members, Rendiconto e altre aree, evitando integrazioni parallele che modificano gli stessi file.
6. **Gate CI sullo SHA esatto.** PASS di una build non equivale a QA autenticata APP-01..APP-15. Registrare separatamente build, safety, PostgreSQL/migrations, smoke e QA.
7. **Protezione ambienti.** Nessuna modifica, reset, deploy o intervento su QA/Production durante l'audit; nessun merge senza autorizzazione esplicita.
8. **Evidenza e chiusura.** Ogni punto è chiuso solo dopo implementazione, test realmente eseguiti, documentazione e allineamento del branch. Le sole verifiche statiche non vengono dichiarate runtime.

## Applicazione alle PR attualmente aperte

| PR | Area / decisione | Stato verificato (SHA esatto) | Decisione |
|---|---|---|---|
| #386 | CAP lookup asincrono; soluzione con helper runtime e test contro risposte obsolete | Baseline Safety PASS; Build PASS; Final QA skipped | Mantenere draft; candidata preferita rispetto a #140, ma non chiudere #140 prima dell'assorbimento/integrazione verificata |
| #387 | Accounting membri: scope workspace + loader paginato | Baseline Safety PASS; Build PASS; Final QA skipped | Mantenere draft; riconciliare file condivisi con #388 prima di qualsiasi integrazione |
| #388 | Rendiconto: pagamenti parziali e allocazioni miste | Baseline Safety PASS; Build PASS; Final QA skipped | Mantenere draft; non integrare in parallelo a #387 perché entrambe toccano AccountingPage.tsx e package.json |

## Ordine operativo per la fase successiva

1. Recuperare tutti i PR candidati e i loro head/base SHA correnti.
2. Completare la matrice di sovrapposizione file-per-file e di dipendenza, incluse alternative/duplicati.
3. Stabilire l'ordine parent → child e il gruppo cumulativo per ciascuna area.
4. Riconciliare i file condivisi (in particolare `package.json`, `AccountingPage.tsx`, helper e test) prima di scegliere un'unico diff cumulativo.
5. Eseguire CI sullo SHA cumulativo esatto e registrare i risultati; non inferire PASS da un PR parent o da uno SHA precedente.
6. Eseguire i gate QA autenticati solo nella fase autorizzata; non alterare QA/Production per l'audit.
7. Richiedere autorizzazione esplicita prima di merge o deploy.

## Criterio di chiusura del Punto 7

Il Punto 7 è chiuso **come definizione e formalizzazione delle decisioni operative**. Non significa che le consolidazioni siano integrate, che tutte le PR duplicate siano chiuse, che QA sia certificata, né che sia autorizzato il merge/deploy.

## Vincoli mantenuti

Nessun merge, deploy, reset o modifica dati/configurazioni QA/Production eseguito.
