# Audit — aggiornamento della data all'apertura del pagamento rata

**Data:** 25 novembre 2026

## Difetto riproducibile

La PR #444 aveva corretto il default iniziale e il reset del modulo pagamento usando `localISODate()`. Il pulsante `Registra pagamento`, però, aggiornava soltanto l'importo e conservava `paymentForm.payment_date` già presente nello stato React.

Se BETHAG rimaneva aperto oltre la mezzanotte e l'utente apriva per la prima volta il modulo di pagamento il giorno successivo, il campo poteva quindi mostrare la data del giorno precedente.

## Correzione

- Aggiornare `payment_date` con `localISODate()` ogni volta che viene aperto il modulo di pagamento di una rata.
- Conservare il calcolo dell'importo residuo.
- Lasciare invariata la possibilità dell'utente di modificare la data dopo l'apertura.

## Regressione

`scripts/test-accounting-payment-open-date-refresh.mjs` verifica:
- che il gestore del pulsante aggiorni la data a ogni apertura;
- il comportamento di `localISODate()` in `Europe/Rome` vicino alla mezzanotte e al cambio dell'ora legale;
- l'inclusione del test in `npm test`.

## Verifica

La prima CI sul commit `cc460330c8131ff4abbce56faf897b190236c241` aveva rilevato un'asserzione ereditata che contava due occorrenze di `payment_date: localISODate()`; il nuovo gestore di apertura ne introduce correttamente una terza. Il test è stato aggiornato per coprire inizializzazione, reset e apertura.

Il commit corretto di codice e test `ec7af4f2e30568a424632a0c34dd5e8bd8937cbd` ha superato il workflow `45576390721`. Il commit finale della PR prima di questo aggiornamento documentale, `97fc96002cbaf7bc34929451f8b461ce54b96392`, ha superato il workflow `45576408711` con **SUCCESS**:
- job `build`: PASS, inclusi `npm test`, Vite build e browser smoke pubblico isolato;
- job `postgres-bootstrap`: PASS, inclusi bootstrap PostgreSQL 17 e prove isolate delle migrazioni.

I job di autenticazione/diagnostica QA sono stati SKIPPED dalle condizioni del workflow per questo branch. Nessun test autenticato QA è stato eseguito. Il commit documentale che registra queste evidenze richiede una nuova CI sul proprio SHA prima della chiusura definitiva.
## Sicurezza operativa

PR Draft isolata, basata sulla PR #445 (integrata in main) verificata. Nessuna modifica a QA o Production, nessun merge, deploy, reset o dispatch manuale.
