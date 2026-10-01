# BETHAG — verifica contratto client/backend per invio email — batch 21

**Repository:** `federico1bartolucci-ctrl/BETHAG`  
**Branch:** `bethag-migration-repair`  
**Supabase:** progetto `tctcgptrsmvgajqjgnev`, lettura soltanto  
**Tipo:** analisi statica del contratto client ↔ Edge Function distribuita. Nessun test/invio.

## Evidenza

Il client nel branch `src/main.tsx`, nel percorso di invio comunicazioni, invoca `bethag-send-email` inviando nel body:
- `workspaceId`
- `communicationId`
- `condominiumId`
- `recipients`
- `subject`
- `body`
- `audience`

Il client richiede `data.success`; per il conteggio usa `data.recipients` con fallback al numero di destinatari locali. Dopo il successo imposta localmente lo stato email a “Inviata”.

La versione distribuita attiva (v7) dichiara invece `type Body = { communicationId: string }`, richiede tale identificativo, carica `communications` per `id`, verifica appartenenza e permesso comunicazioni, prepara `communication_recipients`, marca/accoda destinatari, invia email individuali, aggiorna stato e ritorna `success`, `sent`, `failed`, `remaining`, `status` (oppure `recipientCount` nel percorso idempotente).

Il sorgente nel branch presenta un contratto differente: si basa su workspace/condominio, destinatari e testo forniti dal client; verifica che le email appartengano al condominio; invia i destinatari in un'unica richiesta al provider e restituisce `success`, `id`, `recipients`.

## Implicazioni da verificare

1. **Flusso dati divergente:** il client fornisce i destinatari e il testo, ma la funzione distribuita recupera il contenuto della comunicazione e i destinatari preparati dal database. Va accertato che la comunicazione sia salvata e pubblicata prima dell'invocazione e che il relativo ID inviato sia il PK atteso dalla funzione, non un legacy ID.
2. **Semantica del destinatario:** il client attende un conteggio, ma la funzione distribuita usa una coda persistita e invia per-recipient. Il numero di destinatari locali non prova quanti invii siano riusciti.
3. **Esito parziale:** la funzione distribuita può restituire `success: true` anche con `failed > 0` o `remaining > 0`; il client attuale può mostrare “inviata correttamente” e impostare lo stato locale “Inviata” senza rappresentare tali dettagli.
4. **Idempotenza e retry:** la versione distribuita usa stati della tabella `communication_recipients` e reset delle righe stale. Va testato se retry, timeout tra provider e DB, e richieste concorrenti possano produrre duplicati o stati non allineati.
5. **Versione effettivamente pubblicata:** il branch analizzato non è necessariamente il bundle client in uso. Non è stato verificato quale commit sia attualmente servito agli utenti.

Questi sono rischi di contratto e scenari QA, non una dichiarazione che l'invio email in produzione sia certamente rotto. Non è stata effettuata alcuna invocazione o spedizione.

## Gate di correzione

- Recuperare/identificare il commit del frontend effettivamente distribuito e il relativo percorso UI.
- Scegliere esplicitamente un solo contratto di invio: comunicazione persistita + coda server-side, oppure invio diretto con payload convalidato. Non mantenere un ibrido implicito.
- Allineare tipi, ID (PK vs legacy ID), risposta, stati parziali e messaggi UI.
- Aggiungere test unitari/contrattuali e test isolati con provider simulato, poi prove E2E con destinatari sintetici e dominio di test.
- Non modificare la Edge Function attiva né eseguire deploy prima di review e autorizzazione esplicita.

## Esito

**Contratto client/backend non riconciliato; invio email non certificato per il lancio.** Nessun codice, database, segreto, email o deploy è stato modificato.
