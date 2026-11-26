# Audit — R2 restore target emptiness

**Data:** 26 novembre 2026

## Difetto riproducibile

Il preflight del ripristino R2 eliminava dall'inventario tutti gli oggetti con chiave terminante in `/` prima di verificare che il bucket di destinazione fosse vuoto.

Nel modello S3 una chiave come `empty-folder/` è comunque un oggetto. Un bucket contenente soltanto un folder marker veniva quindi considerato vuoto e superava il controllo, in contrasto con la condizione operativa che richiede un target senza alcun oggetto.

La riproduzione precedente è:

```js
[{ Key: "empty-folder/" }].filter((item) => item.Key && !item.Key.endsWith("/"))
```

Il risultato è un array vuoto, nonostante l'oggetto esista.

## Correzione

- Il controllo usa una richiesta `ListObjectsV2` limitata a un oggetto: basta un solo risultato per dimostrare che il target non è vuoto.
- I folder marker sono conteggiati come oggetti.
- Risposte troncate, malformate, senza metadati sufficienti o con `KeyCount` incoerente non sono considerate prova di un bucket vuoto.
- Il controllo non esegue scritture e non richiede credenziali di ripristino durante i test.

## Regressione

`scripts/test-storage-restore-r2-contract.mjs` verifica:
- bucket realmente vuoto;
- oggetto normale presente;
- solo folder marker presente;
- risposta troncata;
- metadati `Contents` / `KeyCount` assenti o incoerenti;
- richiesta limitata a `MaxKeys: 1`.

Il test è già incluso nel comando `npm test` tramite il contratto di ripristino R2.

## Limiti della verifica

La regressione usa un client S3 simulato e non esegue un ripristino reale. Il restore drill non viene eseguito; nessun bucket QA o Production viene contattato o modificato.
