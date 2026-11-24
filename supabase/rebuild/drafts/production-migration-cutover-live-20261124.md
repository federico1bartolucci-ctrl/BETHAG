# BETHAG — proposta aggiornata cutover ACL globale

**Stato:** DRAFT — NON APPROVATA, NON ESEGUIBILE  
**Rilevazione ledger:** 24 novembre 2026, sola lettura  
**Ramo tecnico:** `fix/postgres-global-function-default-acl-20261124`  
**Commit di base:** `d020633b75b23413c46d0d64ecd4bf1d568565de`

## Stato live verificato

| Ambiente | Ledger | Esito |
|---|---:|---|
| Production | 267 righe, head `20261105050000` | Le 19 migrazioni precedenti sono già presenti con versione/nome corrispondenti |
| QA | 283 righe | Storia distinta; non va resettata né forzata alla parità |

In Production manca solo `20261124234000_revoke_postgres_global_public_function_execute.sql`. Se il preflight finale confermerà lo stesso stato, il ledger atteso sarà 268 righe: 267 storiche preservate + 1 nuova.

## ACL verificati

- Default globale funzioni postgres: `{=X/postgres,postgres=X/postgres}`.
- Default postgres nello schema public: `{postgres=X/postgres}`.
- Default specifici storage: grant a anon, authenticated e service_role da preservare.
- Funzioni public: 130; funzioni con PUBLIC EXECUTE: 0, in Production e QA.

Il difetto riguarda le funzioni future create da postgres; non dimostra un'esposizione delle funzioni public esistenti.

## Sequenza e clean-install

- Migrazioni da aggiungere a Production: **1**.
- File SQL clean-install: **29** (5 baseline + 1 head canonico + 20 incrementali + 3 forward Production).
- Hash candidato: `499ea493e828243309ee2f4bb9c3242d2fbeb862`.
- Postflight ipotizzato: ledger 268, head `20261124234000`.

## Gate ancora aperti

1. Preflight/postflight dedicati al ledger live 267→268.
2. Runner separato e fail-closed, senza modificare il runner storico 19/248/267.
3. Clean-install PostgreSQL 17 e rehearsal runner isolata.
4. Regressione ACL sulla revisione finale e CI completa.
5. Compatibilità QA senza reset né scritture remote.
6. Nuovo fingerprint e approvazione esplicita legata al commit e all'hash della migrazione.

## Stato operativo

Nessun merge, deploy, migrazione o modifica a Production/QA. Nessun reset, nuovo ambiente a pagamento o riscrittura delle 267 righe storiche. L'autorizzazione storica per 19 migrazioni non è riutilizzabile.

**Esito:** proposta riallineata ai ledger live; non ancora eseguibile. Punto 3 aperto.
