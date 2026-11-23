# Audit — paginazione delle ricerche unità immobiliari

**Data:** 23 novembre 2026

## Difetto riproducibile

Tre operazioni interrogavano `condominium_units` senza paginazione. Con il limite REST di 1.000 righe, una unità oltre la prima pagina poteva non essere trovata:
- modifica/salvataggio unità (`saveCondominiumUnit`): l'unità oltre il limite non veniva riconosciuta; una modifica con codice nuovo poteva inserire un'altra riga invece di aggiornare la riga esistente;
- associazione di un condòmino all'interno (`saveCondominiumMember`): un'unità oltre il limite risultava inesistente e il salvataggio del condòmino veniva rifiutato;
- cancellazione condòmino (`deleteCondominiumMember`): gli `ownerMemberIds` sulle unità oltre il limite non venivano ripuliti.

## Correzione

Introduzione di `loadCondominiumUnitRows`, che legge tutte le pagine da 1.000 righe con ordinamento stabile per ID, propagando gli errori di ogni pagina. Le tre operazioni riutilizzano il helper; la cancellazione mantiene anche il filtro workspace.

## Regressione

`scripts/test-condominium-unit-query-pagination.mjs` verifica:
- retrieval della riga 1001 su seconda pagina;
- range e ordinamento stabili;
- filtro workspace;
- propagazione di un errore nella seconda pagina;
- wiring delle tre operazioni al helper e integrazione in `npm test`.

## Limiti di verifica

Il test runtime isolato del helper con client mock è stato eseguito localmente e ha passato. La checkout completa non è disponibile nel container (clone GitHub bloccato dalla risoluzione DNS); la verifica statica contro il repository e `npm test`/build sono quindi demandate alla CI della PR.

Nessuna modifica a QA o Production. Nessun merge o deploy.
