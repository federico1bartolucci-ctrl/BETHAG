# Subentro: confronto dei rami client e backend

Data verifica: 2026-10-03  
Ramo di riferimento del ripristino: `bethag-migration-repair`

## Esito

Il ramo `bethag-migration-repair` non contiene riferimenti diretti alla registrazione o chiusura dei subentri nei file `src/main.tsx` e `src/lib/bethagBackend.ts`. In quest'ultimo è presente soltanto la sincronizzazione generale dei proprietari sulle unità quando si salva l'anagrafica del condòmino; non costituisce una procedura di subentro.

È stata però rintracciata un'implementazione alternativa nel ramo `feature/subentro-rpc-client-20261002`:
- `src/main.tsx` importa `confirmCondominiumMemberTransfer` e `closeCondominiumMemberTransfer`, espone il callback `executeMemberTransfer`, aggiorna i membri, le unità e i membri del portale dopo la conferma e mostra lo storico dei trasferimenti.
- `src/lib/bethagBackend.ts` valida gli UUID di unità, membro uscente e account entrante, valida la data ISO `AAAA-MM-GG`, richiede il nominativo del nuovo titolare e invoca le RPC `confirm_condominium_member_transfer` e `close_condominium_member_transfer`.
- La funzione client documenta che la conferma del trasferimento non crea autonomamente l'accesso del nuovo titolare al Portale.

Un ulteriore ramo, `feature/preserve-member-database-uuid`, contiene elementi di interfaccia per l'anteprima contabile (residui scaduti, versato, numero rate e spese straordinarie deliberate prima e dovute dopo), ma non va assunto come compatibile con il ramo di ripristino senza un confronto completo delle dipendenze e delle RPC.

## Rischi e verifiche ancora necessarie

1. L'implementazione alternativa non è stata integrata nel ramo `bethag-migration-repair` e non è stata verificata con build, typecheck o test end-to-end.
2. Il form visibile acquisisce nominativo ed e-mail del nuovo titolare; il controllo server dell'identità dell'account entrante e della corrispondenza con l'e-mail verificata resta da dimostrare e costituisce un blocco prima dell'attivazione.
3. Il trasferimento non va considerato un'automatica migrazione dei riferimenti contabili storici: occorre definire e verificare la conservazione delle competenze fino alla data dell'atto, rate già scadute, pagamenti parziali e spese deliberate prima ma esigibili dopo.
4. La chiusura contabile deve applicare un perimetro esplicito per le partite aperte (intera posizione del soggetto oppure la sola unità trasferita), evitando di archiviare il titolare mentre residuano obbligazioni pertinenti.
5. La tabella di produzione ha un indice univoco parziale su `(unit_id, transfer_date)` per gli stati `Confermato` e `Chiuso`; la gestione client deve presentare il conflitto in modo comprensibile e consentire la correzione senza duplicare trasferimenti.
6. La coerenza tra workspace, condominio, unità, membro uscente e membro entrante va controllata server-side, non soltanto dal form.

## Decisione tecnica

Recuperare l'implementazione alternativa come riferimento per un porting selettivo, non copiare l'intero ramo. Prima del porting, confrontare le firme e il comportamento effettivo delle RPC di produzione con le versioni SQL associate al ramo alternativo; quindi allineare tipi, caricamento dati, gestione errori e refresh dello stato. Non applicare migrazioni né modificare il database di produzione sulla base di questo solo confronto.

## Perimetro dell'intervento

Questa verifica è di sola lettura rispetto al database. Non sono state applicate migrazioni, modificati dati di produzione, eseguiti merge o deploy. Il collaudo complessivo resta rinviato fino alla risoluzione dei blocchi individuati.
