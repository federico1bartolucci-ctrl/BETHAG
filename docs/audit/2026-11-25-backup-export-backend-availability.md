# Audit — backup export senza snapshot backend

**Data:** 25 novembre 2026

## Difetto riproducibile

`exportWorkspaceBackup` leggeva le tabelle soltanto quando sia `supabase` sia `profile.workspaceId` erano valorizzati. Se Supabase era disabilitato o non configurato (la configurazione esporta esplicitamente `supabase = null`), oppure mancava il workspace attivo, il blocco di lettura veniva saltato senza registrare alcun errore.

Il file veniva comunque generato con `backend: {}` e `backendReadErrors: {}`. L'interfaccia mostrava quindi «Backup BETHAG esportato correttamente», anche se nessuna tabella backend era stata esportata.

## Correzione

- Verificare la disponibilità del client Supabase e del workspace prima di iniziare l'esportazione backend.
- Registrare il motivo in `backendReadErrors.__backend` se non è possibile leggere il backend.
- Mostrare un avviso di backup incompleto, mantenendo comunque il file locale scaricabile.
- Riutilizzare il percorso di avviso già presente nel ripristino, che formatta `backendReadErrors` e informa l'utente prima della conferma.

## Regressione

`scripts/test-backup-export-backend-availability.mjs` verifica:
- Supabase assente;
- workspace assente;
- configurazione valida;
- controllo prima della prima lettura;
- persistenza dell'errore nel backup;
- messaggio UI non-successo;
- propagazione del motivo nel warning di ripristino;
- inclusione in `npm test`.

Nessuna connessione o scrittura su QA/Production è necessaria per il test.
