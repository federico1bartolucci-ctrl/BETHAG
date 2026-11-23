# CAP — Report finale: correzioni integrate, residue e blocchi reali
Data verifica: 23 novembre 2026

## 1. Ambito e limiti
Questo report fotografa i dati GitHub/CI verificati durante la verifica. Non certifica l'integrazione dei PR nel branch principale né un collaudo end-to-end del codice cumulativo. Non sono stati eseguiti merge, deploy, modifiche a QA/Production, reset o dispatch manuali.

Le fasi 1–7 sono mantenute nello stato precedentemente dichiarato dall'utente e dall'assistente; questo report non le riapre retroattivamente. Tuttavia, le evidenze correnti dei PR dimostrano che varie correzioni sono ancora in draft e non integrate.

## 2. Stato reale delle correzioni (PR 378–388)

| PR | Correzione | Stato PR | Evidenza CI rilevata |
|---|---|---|---|
| #378 | Pagina il controllo documenti alla chiusura intervento, filtrato per work_id | Open, draft, non merged | Build run 45253046526: success; Final QA APP-01..15 skipped |
| #379 | Paginazione articoli e fornitori; cursore testo PostgREST validato/escaped | Open, draft, non merged | Build run 45264171144: success |
| #380 | Paginazione caricamento SAL/work progress | Open, draft, non merged | Build run 45264444134: success |
| #381 | Correzione residui Rendiconto con rate e allocazioni miste | Open, draft, non merged | Build run 45206475394: success |
| #382 | Scope workspace nel caricamento membri Accounting | Open, draft, non merged | Build run 45159798803: success; baseline safety 45159798832: success; Final QA skipped |
| #383 | Scope workspace nella ricerca membri per rate unificate | Open, draft, non merged | Build run 45161084635: success |
| #384 | Paginazione verifiche membership admin prima della cancellazione account | Open, draft, non merged | Build run 45186744668: success; baseline safety 45186744713: success; Final QA skipped |
| #385 | Evita mutazioni assicurazioni su contesto condominio stale | Open, draft, non merged | Build run 45181832092: success |
| #386 | Evita risposte CAP asincrone stale che sovrascrivono Comune/Provincia | Open, draft, non merged | Baseline safety 45265531174: success; Build 45265531117: success; Final QA skipped |
| #387 | Consolidamento scope/paginazione membri Accounting (#382/#383 con loader paginato) | Open, draft, non merged | Baseline safety 45275991796: success; Build 45275991828: success; Final QA skipped |
| #388 | Consolidamento Rendiconto rate/allocazioni (#306/#381) | Open, draft, non merged | Baseline safety 45274935119: success; Build 45274935368: success; Final QA skipped |

## 3. Correzioni che hanno evidenza CI positiva
Le CI consultate risultano positive per i workflow indicati sopra. Questo è un esito di workflow/branch, non prova di merge né certificazione dell'applicazione completa.

In particolare:
- #378, #379 e #380 hanno Build success.
- #381 ha Build success.
- #382 ha Build e Baseline Safety success.
- #383 ha Build success.
- #384 ha Build e Baseline Safety success.
- #385 ha Build success.
- #386 ha Build e Baseline Safety success.
- #387 ha Build e Baseline Safety success.
- #388 ha Build e Baseline Safety success.

## 4. Residui verificati
1. I PR #378–#388 sono ancora open e draft, non merged.
2. I PR di consolidamento #387 e #388 non sono integrati nel branch principale.
3. Il Final QA APP-01..APP-15 è esplicitamente skipped nei workflow consultati per #378, #382, #384, #386, #387 e #388; non va presentato come PASS.
4. Alcune correzioni (es. #383, #385, #381) hanno Build success, ma dai workflow consultati non risulta un Final QA completo su quegli SHA.
5. Non è stata verificata in questa sessione una CI cumulativa su un unico SHA che contenga tutti i gruppi di correzioni e relativi conflitti risolti.

## 5. Blocchi reali
- **Blocco integrazione:** correzioni ancora distribuite in PR draft aperti; non risultano merged.
- **Blocco collaudo cumulativo:** manca evidenza di un run completo APP-01..APP-15 sul codice consolidato.
- **Blocco certificazione regressioni:** build CI positiva per diversi PR non equivale a collaudo dell'insieme integrato.

## 6. Cosa non risulta fatto / non si dichiara
- Nessun merge o deploy.
- Nessuna modifica ai dati QA o Production.
- Nessun reset.
- Nessuna certificazione APP-01..APP-15.
- Nessuna dichiarazione che tutti i difetti siano stati risolti o che il rilascio sia pronto.

## 7. Conclusione
La verifica documentale del Punto 8 è completata come report di stato basato sulle evidenze GitHub/CI disponibili.

**CAP/report: redatto. Consolidamento tecnico globale: non certificato. Rilascio: non certificato.**

Il punto 8 chiude la produzione del report, non i blocchi tecnici di integrazione e collaudo descritti sopra.
