# Audit — rilevazioni consumi escluse dal backup workspace

**Data:** 24 novembre 2026

## Difetto verificato

La tabella `public.condominium_consumption_readings` è utilizzata dalla pagina Contabilità:
- la query di caricamento legge le rilevazioni filtrando per `workspace_id`;
- il salvataggio manuale e l'importazione CSV scrivono sulla stessa tabella;
- le righe contengono letture precedenti/correnti, consumo, kWh, valore di riparto e importo addebitato.

La baseline PostgreSQL definisce `workspace_id NOT NULL` e chiavi esterne verso `condominiums`, `condominium_units` e `condominium_fiscal_years`. La tabella è quindi compatibile con il loader generico paginato workspace-scoped già utilizzato dal backup.

Alla base della PR #407 la tabella era assente sia da `WORKSPACE_BACKUP_EXPORT_TABLES` sia da `WORKSPACE_BACKUP_RESTORE_ORDER`. Un backup poteva quindi omettere le rilevazioni dei consumi, anche se la pagina Contabilità le utilizza per la gestione e la ripartizione delle spese.

## Correzione

- Aggiunta `condominium_consumption_readings` al manifest di esportazione.
- Aggiunta al manifest di ripristino dopo condomini, unità ed esercizi fiscali, rispettando le chiavi esterne.
- Estesa la regressione runtime già collegata a `npm test`.
- Il test verifica presenza unica nei due manifest, ordine delle dipendenze, filtro workspace del loader e utilizzo effettivo della tabella nella pagina Contabilità.
- Nessuna modifica a schema, policy RLS, dati o comportamento di salvataggio contabile.

## Limiti

Questa PR copre esclusivamente le rilevazioni consumi. Le tabelle di intake, trasformazione unità, storno pagamenti e destinatari comunicazioni restano escluse e richiedono verifiche autonome sulle rispettive semantiche di workflow, identità e immutabilità.

## Dipendenza

Stacked sulla PR #407, head `971a6e2b8185a7d2f016a624c69035c9e5bd3829`, che corregge il test del manifest introdotto dalla #405. La catena di backup resta subordinata alla review e all'integrazione ordinata delle PR precedenti.

## Sicurezza

Draft soltanto. Nessuna modifica a QA o Production, nessun merge, deploy, reset o workflow manualmente dispatchato.
