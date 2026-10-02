# BETHAG — percorso “Nuova e-mail” e requisito di identificativo — batch 23

**Branch analizzato:** `bethag-migration-repair`  
**File:** `src/main.tsx`  
**Funzione distribuita:** `bethag-send-email` v7 (inventario precedente)  
**Tipo di verifica:** statica; nessuna invocazione o spedizione.

## Evidenza del percorso UI

- `openCondominiumEmailComposer` azzera `selectedCommunication` e crea il form con `emptyCommunication`, condominio, audience, destinatari, titolo/contenuto vuoti, stato Bozza e `deliveryMode: "email"`. Non assegna un `id`.
- `CommunicationForm` mostra il pulsante “Invia e-mail” quando è selezionato un condominio e `deliveryMode === "email"`.
- Il pulsante richiama `onPrepareEmail(value.condominiumId, ..., value.id || undefined, value.title, value.body, value.audience)`. Nel compositore nuovo, `value.id` è assente fino a un eventuale salvataggio della comunicazione.
- `prepareCondominiumEmail` include il parametro `communicationId` nel body della chiamata Edge anche quando è `undefined`.
- La Edge Function distribuita v7 richiede un body con `communicationId: string` e usa quell'ID per recuperare la comunicazione persistita.

## Conclusione circoscritta

**Incompatibilità del percorso “Nuova e-mail” nel codice branch con il contratto della funzione distribuita:** il compositore diretto non crea né persiste una comunicazione prima dell'invocazione e passa un ID mancante. Se questo esatto frontend è quello servito, l'Edge Function non riceve il campo obbligatorio e il percorso non può completare il flusso atteso dalla versione distribuita.

La conclusione riguarda il sorgente del branch e la versione Edge recuperata; non dimostra quale bundle frontend sia attualmente pubblicato né costituisce un test runtime.

## Percorso “Nuova comunicazione”

Il salvataggio di una comunicazione aggiorna lo stato locale. Un effetto distinto pianifica la sincronizzazione backend con 500 ms di ritardo; il salvataggio non attende la persistenza né riceve una PK database. Il modello UI espone `row.legacy_id` come `id`, mentre la funzione Edge recupera la riga con la colonna PK `id`. Pertanto anche il percorso di invio da comunicazione già esistente richiede una risoluzione esplicita dell'identificativo e una conferma di persistenza.

## Correzione architetturale richiesta (non applicata)

1. Separare il comando “Salva bozza” dall'azione “Invia e-mail”.
2. Rendere il salvataggio awaitable e ritornare l'ID database canonico.
3. Avviare l'invio solo dopo conferma server-side della comunicazione e della lista destinatari.
4. Validare lato server workspace, condominio, permesso, audience e destinatari; non fidarsi del client per autorizzazione.
5. Restituire e visualizzare uno stato di consegna distinguendo completati, falliti e rimanenti; retry idempotente.
6. Conservare compatibilità esplicita per i record legacy senza confondere PK database e ID legacy.

## QA isolata necessaria

- Nuova e-mail inviata senza salvataggio (deve essere impedita con messaggio chiaro o salvata automaticamente prima dell'invio).
- Salva bozza, refresh, riapri e invia.
- Invio immediato dopo il salvataggio, con rete lenta.
- ID database vs legacy ID, workspace/condominio errati.
- Tutte le audience, nessun destinatario email, email duplicate.
- Invio parziale, timeout, retry, doppio click e richieste concorrenti.
- Verifica che la UI rifletta lo stato server-side, non soltanto uno stato locale ottimistico.

## Sicurezza e stato

Non è stata modificata alcuna funzione Edge o sorgente applicativo. Nessun test runtime, invio reale, segreto letto, scrittura Supabase, migrazione o deploy. Il flusso comunicazioni rimane **non certificato** e il rilascio non va considerato approvato su questa base.
