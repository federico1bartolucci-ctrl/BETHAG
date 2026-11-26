# Audit — mantenere il profilo amministratore vincolato al workspace attivo nel restore

**Stato:** correzione frontend; nessuna modifica a QA/Production.

## Difetto

Il restore controllava che `backup.workspaceId` coincidesse con il workspace attivo, ma poi applicava direttamente `backup.frontendState.profile` e ripristinava anche la chiave profilo dal blocco generico `localStorageData`. Un backup modificabile poteva quindi avere un workspace top-level valido e un profilo annidato con un diverso `workspaceId`, sovrascrivendo l'identità del workspace attivo dopo il controllo iniziale.

## Correzione

- Validare il profilo annidato prima delle conferme utente e prima di qualsiasi scrittura backend.
- Rifiutare profili non-oggetto, campi non stringa o un `workspaceId` annidato diverso dal contesto attivo.
- Normalizzare i profili legacy privi di `workspaceId` sul workspace attivo.
- Copiare soltanto i campi ammessi di `AdminProfile`, mantenendo i valori correnti per i campi omessi.
- Usare esclusivamente il profilo normalizzato per React e localStorage.
- Escludere sempre `KEYS.profile` dal restore generico di localStorage, evitando che il payload grezzo sovrascriva il profilo normalizzato.

## Regressione

Il test verifica il profilo annidato contraffatto, profili legacy, campi sconosciuti, payload malformati, il preflight prima della conferma e l'assenza di scritture quando il controllo fallisce.

La correzione è frontend-only e non modifica dati backend, migrazioni o configurazione Supabase.
