# Audit — conferma puntuale della pulizia Storage nella cancellazione del condominio

**Data:** 27 novembre 2026

## Difetto riproducibile

`deleteCondominiumWithStorageCleanup()` considerava completata la pulizia quando `removeBatch()` restituiva un array, senza verificare che la risposta confermasse ciascun percorso richiesto.

Una risposta senza errore ma con `data: []`, oppure con una risposta parziale, poteva quindi produrre `storageDeleted: true` mentre uno o più oggetti non risultavano confermati come rimossi.

## Correzione

- Riutilizzare il contratto di conferma per percorso già introdotto nella catena #654 per il rollback degli upload.
- Esportare `getUnconfirmedStorageRemovalPaths()` da `documentStorageUpload.js`.
- Usare lo stesso helper nella cancellazione del condominio.
- Considerare incompleti soltanto i percorsi richiesti che non compaiono nella risposta Storage.
- Conservare il comportamento: l'RPC database resta autorevole e, se fallisce, Storage non viene toccato.

## Regressione runtime

Il test `scripts/test-condominium-storage-delete-outcome.mjs`, già incluso in `npm test`, ora copre:
- risposta `data: []` senza errore;
- risposta parziale che conferma solo alcuni percorsi;
- risposta con percorsi estranei;
- conservazione dei test su errori espliciti, batching e fallimento database;
- wiring del helper condiviso.

## Dipendenza

Draft follow-up impilato sulla PR #654, head `3ec952b4dcbfbead8094a36f6bc02cea0aa90a91`. Non modifica il branch della #654 e non duplica il suo fix: riutilizza il suo contratto per il distinto flusso di cancellazione del condominio.

## Sicurezza e limiti

Nessun accesso o modifica a QA/Production. Nessun merge, deploy, reset o workflow dispatch manuale. La risposta Storage viene trattata in modo conservativo: un percorso non restituito è classificato come non confermato e richiede verifica, anche se potrebbe essere già assente dal bucket.

## Verifica CI sullo SHA definitivo

**Head:** `360609762dbddacef5db0796d1c14e0863d6b72b`

**Workflow:** [BETHAG build #46056644911](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/46056644911) — **SUCCESS**.

- Job `build`: **PASS**.
- `npm test`: **PASS**; marker `Condominium storage deletion pagination and partial-outcome runtime regression: PASS`.
- Baseline verification: **PASS**.
- Security parity: **PASS**; confronto con snapshot Production read-only acquisito, senza connessione live o scritture.
- Vite production build: **PASS**.
- Chromium/public-login browser smoke: **PASS**; marker `BETHAG_PUBLIC_BROWSER_SMOKE_PASS`.
- Job `postgres-bootstrap`: **PASS** su PostgreSQL 17.12, incluse le 28 migrazioni clean-install, le 19 migrazioni canoniche e le prove ACL/RLS/rollback.

Final QA APP-01..APP-15: **SKIPPED / nessun check-run su questa PR impilata**. La Build non equivale a collaudo autenticato.

La PR resta Draft e non integrata. Nessuna modifica a QA o Production; nessun merge, deploy, reset o dispatch manuale.
