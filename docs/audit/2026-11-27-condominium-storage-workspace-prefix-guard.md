# Audit — protezione dei percorsi Storage nella cancellazione del condominio

**Data:** 27 novembre 2026

## Difetto riproducibile

La cancellazione del condominio selezionava le righe `documents` per `workspace_id` e `condominium_id`, ma passava ogni `file_path` a Storage senza verificare che il primo segmento del percorso appartenesse allo stesso workspace.

I percorsi creati dai flussi applicativi osservati sono prefissati da `workspaceId/` (con eventuale segmento del condominio). La policy `BETHAG documents delete` in `20261017000004_bethag_baseline_security.sql` autorizza la rimozione in base al workspace ricavato dal primo segmento di `storage.objects.name`.

Una riga documento malformata o alterata in workspace A che punti a un oggetto del workspace B può quindi indirizzare la pulizia verso un altro workspace quando l'utente dispone dei permessi su entrambi. Il filtro SQL sulla riga documento non convalida il percorso dell'oggetto.

## Correzione

- Richiedere esplicitamente `workspaceId` a `deleteCondominiumWithStorageCleanup()`.
- Verificare che ogni percorso inizi esattamente con `workspaceId/`.
- Rifiutare segmenti vuoti, `.`, `..` e separatori backslash.
- Eseguire la validazione prima dell'RPC di cancellazione e prima di qualsiasi chiamata Storage.
- Se anche un solo percorso non è attribuibile con certezza al workspace, interrompere l'intera cancellazione per preservare il record e consentire la verifica manuale.
- Mantenere il comportamento database-first per i percorsi validi.

## Regressione runtime

`scripts/test-condominium-storage-delete-outcome.mjs`, già incluso in `npm test`, copre:
- percorso valido del workspace corrente;
- percorso di un workspace differente;
- prefisso simile ma non identico;
- segmento `..`;
- segmento vuoto;
- percorso legacy senza prefisso;
- verifica che, in presenza di un percorso non sicuro, non partano né l'RPC di cancellazione né la rimozione Storage.

## Compatibilità e limite

I percorsi prodotti dai flussi correnti `storeCondominiumDocumentFiles` e `storeCondominiumDocuments` usano il prefisso del workspace. Eventuali record storici con percorsi privi di tale prefisso verranno bloccati e richiederanno riconciliazione manuale: non verranno cancellati automaticamente.

## Sicurezza

Nessun accesso o modifica a QA/Production. Nessun merge, deploy, reset o dispatch manuale.
