# Audit — workspace backup e ripristino dei condòmini

**Data:** 26 novembre 2026

## Difetto riproducibile

La tabella `public.condominium_members` è collegata al workspace attraverso `condominium_id` e la tabella `public.condominiums`. Nella baseline SQL non esiste una colonna `workspace_id` su `condominium_members`.

L'esportazione applicava invece il loader workspace-wide a tutte le tabelle. Il loader aggiungeva `.eq("workspace_id", workspaceId)`; su `condominium_members` la richiesta falliva perché la colonna non esiste. Di conseguenza i membri non entravano nel backup e venivano registrati in `backendReadErrors`.

Anche il ripristino generico aggiungeva `workspace_id` a ogni riga prima dell'upsert, rendendo impossibile ripristinare correttamente i membri anche se presenti nel file.

## Correzione

- L'esportazione carica prima i condomini del workspace e poi recupera `condominium_members` filtrando per i relativi `condominium_id`.
- Le letture dei membri usano pagine da 1.000 righe, ordinamento stabile per `id` e blocchi da 100 ID di condominio per limitare la dimensione dei filtri.
- Un errore di pagina viene propagato e registrato, senza esportare silenziosamente un elenco parziale.
- Il ripristino dei membri non aggiunge `workspace_id`; accetta solo righe riferite a condomini inclusi e ripristinati con successo nel workspace corrente e rimuove l'eventuale campo non previsto.

## Regressione

`scripts/test-backup-condominium-members-scope.mjs` verifica tabella senza colonna `workspace_id`, filtro tramite `condominium_id`, paginazione oltre 1.000 righe, chunking oltre 100 condomini, propagazione degli errori di pagina e filtraggio sicuro in ripristino.

## Sicurezza e limiti

Ricostruita sulla main corrente dopo PR #519. Nessuna modifica a QA o Production. Nessuna modifica allo schema o alle migrazioni.
