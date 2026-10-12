# BETHAG — Rilevazione routine PostgreSQL di produzione

**Data rilevazione:** 3 ottobre 2026  
**Progetto:** `tctcgptrsmvgajqjgnev`  
**Metodo:** interrogazioni read-only dei cataloghi PostgreSQL (`pg_proc`, `pg_namespace`, `information_schema.routine_privileges`).  
**Stato:** inventario tecnico, non script di ripristino.

## Conteggio osservato

| Schema | Routine | SECURITY DEFINER |
|---|---:|---:|
| `private` | 39 | 37 |
| `public` | 126 | 36 |
| **Totale** | **165** | **73** |

La query dei cataloghi rileva routine con `search_path` vuoto e routine con `public`, `pg_catalog` e/o `extensions` configurati. La presenza di un `search_path` esplicito non certifica da sola la sicurezza: occorre esaminare i riferimenti non qualificati, l'ownership, i privilegi e le dipendenze.

## Riscontro sui privilegi

La vista `information_schema.routine_privileges` mostra privilegi `EXECUTE` assegnati ad `authenticated` su diverse routine nello schema `private`, incluse funzioni di autorizzazione, operazioni contabili e gestione dei condomìni. Questo riscontro **non è, da solo, una prova di vulnerabilità**: le routine devono essere valutate singolarmente, considerando controlli interni, esposizione tramite API, grants effettivi e chiamate da policy/trigger.

Le funzioni trigger sono incluse nell'inventario catalogato: il privilegio di esecuzione diretto su una funzione trigger non equivale alla possibilità di invocarla come una normale RPC. I grants non vanno modificati in blocco sulla sola base del nome o dello schema.

## Priorità di ricostruzione

1. Acquisire le definizioni complete, una per routine, insieme a firma, proprietario, `SECURITY DEFINER`, `search_path` e grants; mantenere le diverse definizioni `public` e `private` anche quando condividono il nome.
2. Collegare le routine alle migrazioni sorgente e identificare le ridefinizioni successive, preservando la versione finale osservata in produzione.
3. Ricostruire il grafo funzioni → funzioni chiamate → tabelle → trigger/policy e risolvere i cicli prima di preparare il bootstrap.
4. Per le routine `SECURITY DEFINER`, verificare identità, workspace/condominio, autorizzazione di modulo, oggetti qualificati e privilegi minimi.
5. Eseguire test positivi e negativi con ruoli sintetici soltanto in un ambiente isolato ripristinabile.

## Limiti

L'inventario non è un dump completo, non contiene qui i corpi SQL di tutte le 165 routine e non sostituisce l'estrazione dei grants e delle policy in forma canonica. Nessun DDL, grant, dato o oggetto di produzione è stato modificato. Non è stato avviato il collaudo runtime, che resta rinviato a dopo la risoluzione delle lacune di schema e migrazione.
