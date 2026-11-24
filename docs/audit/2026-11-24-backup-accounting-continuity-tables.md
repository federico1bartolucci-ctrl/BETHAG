# Audit — tabelle contabili mancanti nel backup workspace

**Data:** 24 novembre 2026

## Difetto riprodotto

Il manifest di esportazione e l'ordine di ripristino del backup workspace omettevano entrambe le seguenti tabelle presenti nella baseline PostgreSQL:

- `condominium_accounting_settings`
- `condominium_allocation_rules`
- `condominium_member_transfers`
- `condominium_fiscal_carryovers`
- `condominium_fiscal_carryover_compensations`

Poiché i nomi non erano richiesti dal loader di esportazione, il backup poteva risultare formalmente completo senza includere impostazioni contabili, regole di ripartizione, storico dei subentri e saldi/compensazioni di riporto fiscale. Il ripristino non poteva ricostruire dati che il file non conteneva.

## Correzione

- Centralizzati i manifest di esportazione e ripristino in `src/lib/workspaceBackupTables.mjs`.
- Aggiunte le cinque tabelle a entrambi i manifest.
- Mantenuto il loader paginato workspace-scoped già esistente.
- Ordinato il ripristino rispettando le dipendenze: condomini, unità, membri, esercizi e tabelle millesimali prima dei record dipendenti; carryover prima delle compensazioni.
- Il ripristino continua a usare le protezioni di proprietà/ID della PR #403: preflight, UPDATE con filtri espliciti e INSERT separato, senza upsert ID-only.

## Regressione runtime

`scripts/test-workspace-backup-accounting-tables.mjs` è collegato a `npm test` e verifica:

- presenza esattamente una volta delle cinque tabelle nei manifest;
- ordine delle dipendenze per trasferimenti, regole, carryover e compensazioni;
- lettura effettiva tramite il loader paginato con filtro `workspace_id`;
- esclusione di righe appartenenti a un workspace diverso;
- integrazione dei manifest nel gestore reale di export e restore;
- presenza di `workspace_id` nelle definizioni della baseline.

## Limiti dichiarati

Questa correzione copre le cinque tabelle contabili/di continuità indicate. Altre tabelle non ancora presenti nei manifest (ad esempio workflow di intake, letture consumi, trasformazioni unità, audit di storno e destinatari comunicazioni) richiedono una valutazione separata delle rispettive regole di immutabilità, identità e ripristino; non vengono dichiarate risolte da questa PR.

## Dipendenza e sicurezza

Stacked sulla draft PR #403, head `9fa3e6ccf1b256970d2032db41b2fb985fafbb6c`. Nessuna modifica a QA o Production; nessun merge, deploy, reset o workflow manualmente dispatchato.
