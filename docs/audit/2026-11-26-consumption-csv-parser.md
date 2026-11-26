# Audit — importazione CSV dei consumi

Data: 26 novembre 2026

## Difetto riprodotto

Il parser precedente separava ogni riga sia su punto e virgola sia su virgola, indipendentemente dal formato dichiarato dall'intestazione.

Un CSV italiano delimitato da punto e virgola con valori decimali come 100,5 veniva quindi spezzato in colonne aggiuntive. La riga non manteneva più la corrispondenza con le intestazioni e poteva essere interpretata in modo errato o saltata.

Esempio riprodotto:

Unita;Esercizio;Lettura precedente;Lettura attuale;Consumo;Note
A1;2026;100,5;110,5;10,0;lettura principale

## Correzione

- Rileva un solo delimitatore dall'intestazione: punto e virgola, virgola oppure tabulazione.
- Rispetta campi quotati, virgolette raddoppiate e campi multilinea.
- Rimuove il BOM UTF-8.
- Rifiuta intestazioni duplicate, virgolette non chiuse e righe con numero di colonne incoerente.
- Mantiene le virgole decimali nei CSV delimitati da punto e virgola.
- Per i CSV delimitati da virgola richiede i valori contenenti virgole racchiusi tra virgolette, come previsto dal formato CSV.
- Convalida numeri finiti/non negativi, progressione delle letture, date reali, intervalli e coerenza tra consumo e differenza letture.
- Rifiuta unità o esercizi sconosciuti e annulla l'intero import, senza upsert parziali.
- Mantiene lo scope di workspace e condominio.

## Regressione runtime

scripts/test-consumption-csv-parser.mjs è collegato a npm test.

La prova riproduce il difetto del parser precedente e verifica formati semicolon/comma/tab, decimali italiani, campi quotati e multilinea, BOM, righe malformate, validazione dei dati e comportamento all-or-nothing.

## Sostituzione della PR precedente

La PR #237 era basata sul commit 29ae2870618069e59c21c0c1ae5c642be2f1ca1b, risultava 65 commit indietro rispetto alla main corrente e non era mergeable. Il suo Build falliva perché package.json invocava scripts/verify-consumption-csv-validation.m, mentre il file aggiunto era .mjs; il job Baseline Safety falliva sullo stesso errore di npm test.

Questa PR ricostruisce le validazioni utili su main corrente e aggiunge una regressione runtime reale per il parser. La PR #237 sarà chiusa soltanto dopo la verifica positiva della nuova PR.

## Sicurezza

Branch isolato basato sul commit main 31b431a399045919eace724766c8b31919676309. Nessun accesso o scrittura a QA/Production, nessuna migrazione applicata, nessun merge, deploy, reset o dispatch manuale.
