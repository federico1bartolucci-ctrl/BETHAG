# BETHAG — verifica del collegamento UI per subentro e trasformazioni — batch 13

**Branch:** `bethag-migration-repair`  
**Tipo:** controllo statico dei componenti TypeScript e della presenza di chiamate alle RPC di ciclo di vita.  
**Stato:** non eseguiti test runtime o replay; nessuna modifica al database o al codice applicativo.

## Ambito e metodo

È stato esaminato l'albero del branch `bethag-migration-repair`, che contiene sei file sorgente TypeScript/TSX: `src/main.tsx`, `src/AccountingPage.tsx`, `src/RegisterPage.tsx`, `src/InsurancePoliciesSection.tsx`, `src/lib/bethagBackend.ts` e `src/lib/supabase.ts`. Nei quattro file applicativi/backend ispezionati (`main.tsx`, `AccountingPage.tsx`, `RegisterPage.tsx`, `bethagBackend.ts`) non sono state trovate occorrenze dei nomi tabellari `condominium_member_transfers`, `unit_transformations` o riferimenti testuali individuabili a conferma trasferimento/subentro e trasformazione catastale.

## Risultato

Le migrazioni del branch contengono un insieme articolato di oggetti per il ciclo di vita: trasferimenti di titolarità, snapshot contabili, anteprime, conferma protetta e trasformazioni di unità. Tuttavia, nel codice applicativo esaminato non è stata individuata una chiamata che attivi direttamente questi flussi.

Questo **non dimostra in assoluto che la funzionalità sia assente**: potrebbero esistere componenti dinamici, percorsi non coperti dalla ricerca o una versione applicativa diversa da quella del branch. È però un blocco di integrazione da risolvere prima di considerare subentro e trasformazioni collaudati e disponibili agli utenti.

## Verifiche necessarie

1. Cercare nei restanti sorgenti, configurazioni e chiamate indirette ogni riferimento a RPC/tabelle di trasferimento e trasformazione.
2. Se l'integrazione manca, definire il flusso UI: selezione unità, titolare uscente/entrante, data rogito, anteprima contabile e millesimale, revisione, conferma autorizzata e chiusura del residuo.
3. Distinguere cessazione dell'accesso al portale, conservazione della storia contabile e attribuzione di debiti/crediti: nessun debito deve essere trasferito automaticamente senza regole approvate.
4. Implementare solo dopo baseline QA certificabile; quindi verificare permessi amministratore/collaboratore/condomino, isolamento workspace, errori di identità, doppio invio, concorrenza, rollback e audit.
5. Per fusioni/frazionamenti, collaudare genealogia delle unità, pertinenze autonome, millesimi e quadratura contabile prima e dopo la conferma.

## Esito rispetto al lancio

- **Migrazioni backend:** presenti nel branch, non certificate con replay.
- **Collegamento UI per trasferimenti/trasformazioni:** non individuato nei sorgenti applicativi ispezionati; da verificare e, se confermato, da realizzare.
- **Collaudo end-to-end:** non eseguito.
- **Produzione:** sola lettura, nessuna modifica.
- **Gate:** baseline QA bloccata; il flusso non può essere dichiarato pronto al lancio sulla base di questa revisione.

Questa nota è un audit statico e non una migrazione eseguibile.
