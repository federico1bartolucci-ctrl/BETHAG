# Audit — default globale EXECUTE sulle funzioni PostgreSQL

**Stato:** proposta tecnica in bozza; non approvata e non applicata a QA o Production.

## Difetto

La revoca schema-specifica dei privilegi predefiniti sulle funzioni nello schema `public` non annulla il default globale PostgreSQL che concede `EXECUTE` a `PUBLIC`. I default globali e quelli specifici per schema sono additivi: una funzione futura creata dal ruolo `postgres` può quindi ereditare ancora `EXECUTE` da `PUBLIC` anche se lo schema `public` ha una revoca esplicita.

## Proposta non deployable

Il file candidato resta esclusivamente in:

`supabase/rebuild/drafts/20261124234000_revoke_postgres_global_public_function_execute.sql`

La proposta revoca il default globale `EXECUTE` per le future funzioni create da `postgres`, per `PUBLIC`, `anon`, `authenticated` e `service_role`. Non modifica ACL di funzioni già esistenti e non modifica i default dei ruoli gestiti da Supabase. Non viene aggiunta a `supabase/migrations`: non è visibile al normale `supabase db push`.

## Regressione isolata

La prova PostgreSQL 17:
- riproduce prima il default globale che concede EXECUTE;
- applica la proposta due volte per verificarne l'idempotenza;
- verifica che le nuove funzioni in `public` e `private` non ereditino EXECUTE da PUBLIC o ruoli applicativi;
- verifica che i grant espliciti specifici di `storage` restino efficaci;
- verifica che le ACL di funzioni già create e i default di `supabase_admin` non cambino;
- esegue tutto in una transazione che termina con `ROLLBACK`.

La CI crea un database PostgreSQL 17 effimero e locale dedicato. Il test rifiuta qualsiasi `DATABASE_URL` non loopback.

## Limiti

Questa integrazione aggiunge soltanto il candidato draft, la regressione isolata e la sua esecuzione CI. Non include runner, workflow di cutover, credenziali, approvazioni o procedure di applicazione a Production. L'eventuale promozione richiede revisione separata, nuova verifica dello stato live e approvazione esplicita.
