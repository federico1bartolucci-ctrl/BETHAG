# Audit — date locali dei moduli Contabilità

**Data:** 27 novembre 2026

## Difetto riproducibile

La Contabilità derivava ancora date predefinite in UTC per il nuovo pagamento rata e per l'apertura di una nuova pratica legale. In `Europe/Rome`, vicino alla mezzanotte locale, i form potevano essere precompilati con il giorno precedente.

Il modello statico `emptyLedger` catturava inoltre la data una sola volta all'importazione del modulo: un'applicazione lasciata aperta oltre la mezzanotte poteva riaprire il modulo movimenti con una data non più attuale.

## Correzione

- Usare `localISODate()` per il default iniziale e il reset del form pagamento.
- Usare `localISODate()` per il default iniziale della data di apertura pratica.
- Sostituire `emptyLedger` con `createEmptyLedger(date = new Date())`, invocata all'inizializzazione, all'apertura di un nuovo movimento e dopo il salvataggio.
- Lasciare invariati i valori esplicitamente inseriti e i timestamp tecnici.

Il refresh data a ogni apertura del pagamento e il reset completo del modulo pratica restano in PR successive separate, per evitare duplicazioni e mantenere una PR per volta.

## Regressione

`scripts/test-accounting-local-date-defaults.mjs` verifica default e reset pagamenti, data predefinita della pratica, factory del movimento e date locali in `Europe/Rome` vicino alla mezzanotte e al cambio dell'ora legale. `scripts/test-local-ledger-date.mjs` verifica la factory. Entrambi sono inclusi in `npm test`.

## Sicurezza

Nessun accesso o intervento su QA/Production, nessuna migrazione Supabase, nessun reset e nessun workflow manuale.
