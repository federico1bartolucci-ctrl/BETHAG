# BETHAG — proposta cutover ACL global function default

**Stato:** DRAFT — NON APPROVATA, NON ESEGUIBILE  
**Data proposta:** 2026-11-24  
**PR tecnica di origine:** #434  
**SHA di origine:** 813f7020cb279198d65ff7cdabe0204306f88a09

## Correzione proposta

Aggiungere come ventesima migrazione:

`20261124234000_revoke_postgres_global_public_function_execute.sql`

Blob SHA attualmente presente nel ramo PR #434: `499ea493e828243309ee2f4bb9c3242d2fbeb862`.

La migrazione revoca il default globale EXECUTE per PUBLIC, anon, authenticated e service_role sulle future funzioni create da postgres. Non modifica ACL delle funzioni esistenti né i default dei ruoli gestiti da Supabase. La regressione PostgreSQL 17 già presente nella PR verifica anche la conservazione dei grant specifici di schema (in particolare storage), l'idempotenza e l'immutabilità delle ACL esistenti.

## Impatto previsto — da confermare

| Elemento | Baseline congelata | Proposta |
|---|---:|---:|
| File clean-install | 28 | 29 |
| Migrazioni incrementali | 19 | 20 |
| Ledger finale | 267 | 268 |
| Ultima versione proposta | 20261105050000 | 20261124234000 |

I numeri 248/267 derivano dal manifest storico del 5 novembre. Non attestano lo stato live del 24 novembre: il preflight dovrà acquisire nuovamente ledger Production e QA in sola lettura e ricalcolare i numeri effettivi.

## Modifiche necessarie prima dell'esecuzione

1. Aggiungere il file SQL alla catena canonica solo nel ramo di proposta.
2. Aggiornare l'inventario in `scripts/test-postgres-bootstrap.mjs`.
3. Aggiornare clean-install e i relativi conteggi in `scripts/test-clean-install-migrations.mjs`.
4. Aggiornare `scripts/verify-canonical-cutover-runner.mjs`, runner, preflight e postflight affinché riconoscano esattamente 20 migrazioni e preservino tutte le righe storiche.
5. Produrre un nuovo manifest basato sul ledger live corrente; non sovrascrivere né riutilizzare l'approvazione storica per 19 hash.
6. Eseguire clean-install PostgreSQL 17, rehearsal guarded runner, regressione ACL, CI esatta e collaudo QA autenticato.
7. Calcolare il fingerprint definitivo solo sul commit finale e acquisire una nuova approvazione esplicita per quel fingerprint e per i 20 hash ordinati.

## STOP obbligatori

- Nessun deploy, merge o applicazione su QA/Production.
- Nessun reset, replay remoto o modifica delle 248 righe storiche.
- Nessun nuovo ambiente Supabase a pagamento.
- Nessuna approvazione storica estesa implicitamente alla ventesima migrazione.
- Se il ledger live non coincide con la nuova cattura, ricostruire il piano: non forzare i conteggi 248/268.

## Esito attuale

La regressione isolata della PR #434 è risultata PASS sul relativo SHA; la CI precedente ha lasciato saltati i controlli di autenticazione QA e APP-01..APP-15. Questa proposta non è quindi certificata per il rilascio.
