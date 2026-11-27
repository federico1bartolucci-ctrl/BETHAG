# Audit — aggiornamento della data all'apertura del pagamento rata

**Data:** 27 novembre 2026

## Difetto riproducibile

Il modulo pagamento rata inizializzava e ripristinava correttamente `payment_date` con `localISODate()`, ma il pulsante `Registra pagamento` aggiornava soltanto l'importo residuo e conservava la data già presente nello stato React.

Se BETHAG restava aperto oltre la mezzanotte e il modulo veniva aperto il giorno successivo, il campo poteva quindi mostrare la data del giorno precedente.

## Correzione

Ogni apertura del form aggiorna `payment_date` con `localISODate()`, mantenendo il calcolo dell'importo residuo e lasciando all'utente la possibilità di modificare la data.

## Regressione

`scripts/test-accounting-payment-open-date-refresh.mjs` verifica il gestore del pulsante e il comportamento di `localISODate()` in `Europe/Rome` vicino alla mezzanotte e al cambio dell'ora legale. Il test è incluso in `npm test`; il test dei default contabili ora verifica anche la terza occorrenza del refresh.

## Sicurezza

Nessun accesso o intervento su QA/Production, nessuna migrazione Supabase, nessun reset e nessun workflow manuale.
