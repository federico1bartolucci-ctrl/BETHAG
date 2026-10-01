# BETHAG — flusso di persistenza comunicazioni e identificativi — batch 22

**Branch:** `bethag-migration-repair`  
**Ambito:** revisione statica del client e del contratto con `bethag-send-email`.  
**Impatto:** nessuna modifica al client, al database o alle Edge Functions; nessun invio di email.

## Flusso rilevato nel branch

1. `saveCommunication` valida titolo, corpo, condominio e destinatari selezionati.
2. La funzione aggiorna lo stato React `communications` e chiude il modal; non attende una scrittura backend.
3. Un `useEffect` separato osserva `communications` e pianifica `syncBackendState` con un timeout di 500 ms. La sincronizzazione è asincrona e gli errori sono scritti in console.
4. `syncBackendState` persiste le comunicazioni come righe con `workspace_id`, `legacy_id: item.id`, `condominium_id`, `title`, `body`, `published`, `email_status`, `email_prepared_at` e `data`.
5. Durante l'hydration, il mapper restituisce `id: row.legacy_id` al modello frontend.
6. Il client invoca `bethag-send-email` con `communicationId` dal modello frontend. La Edge Function attiva v7 seleziona la comunicazione con `.eq("id", payload.communicationId)`, non con `legacy_id`.

## Rischi e limiti dell'evidenza

- **Possibile mismatch PK/legacy ID:** il frontend usa l'identificativo legacy, mentre il codice distribuito filtra la PK della riga. La compatibilità non è dimostrata e potrebbe comportare risposta “Comunicazione non trovata”. Prima della correzione occorre confermare tipi e valori nel flusso completo e in ambiente isolato.
- **Race di persistenza:** il salvataggio UI e l'invio email sono due azioni separate; il sync è differito e non viene atteso da `saveCommunication`. L'invio subito dopo il salvataggio può precedere la scrittura.
- **Errore di sincronizzazione non propagato al modal:** il sync registra l'errore in console; l'interfaccia può già mostrare la comunicazione come salvata localmente.
- **Stato dell'invio UI:** il client tratta `success` come invio completato e imposta “Inviata”, mentre la Edge distribuita può riportare fallimenti parziali, rimanenze o stato diverso.
- **Identificativo e destinatari:** la Edge distribuita usa una coda `communication_recipients` preparata lato server. Occorre verificare che audience, selezione destinatari, pubblicazione e body persistito corrispondano alle intenzioni del form.

Questi punti sono una valutazione statica dei sorgenti disponibili, non una prova di comportamento osservato in produzione. Il frontend effettivamente pubblicato non è stato identificato in questa verifica.

## Correzione proposta, non applicata

- Definire un identificativo esplicito nel modello: `legacyId` per compatibilità UI e `databaseId` per relazioni server, oppure far risolvere la comunicazione alla Edge Function mediante `workspace_id + legacy_id` e autorizzazione server-side.
- Rendere il salvataggio della comunicazione un'operazione awaitable che restituisca l'identificativo persistito; consentire l'invio soltanto dopo conferma del salvataggio.
- Allineare il payload della Edge Function e il modello di destinatari (incluso il caso “Consiglio” e “Selezionati”).
- Gestire esplicitamente esiti parziali e stati `sent/failed/remaining`; non mostrare successo pieno solo perché `success: true`.
- Testare in ambiente QA isolato: invio immediato post-salvataggio, refresh e invio, PK/legacy ID, audience tutte/consiglio/selezionati, destinatario duplicato, fallimento provider, timeout, retry, concorrenza e doppio click.

## Gate

**Flusso client → persistenza → coda email non certificato.** Non modificare la funzione attiva, non effettuare invii reali, non scrivere sul progetto Supabase di produzione e non pubblicare modifiche finché la fonte client effettiva, il contratto e la QA isolata non siano riconciliati.
