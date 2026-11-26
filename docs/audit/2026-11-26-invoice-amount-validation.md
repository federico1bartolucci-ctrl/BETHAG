# Audit — validazione rigorosa degli importi fattura

## Difetto

Il parser precedente eliminava ogni carattere non numerico prima della conversione. Una stringa OCR corrotta come `12abc34` poteva quindi diventare un importo apparentemente valido (`1234`) e raggiungere la conferma della fattura.

## Correzione

- Accettare numeri finiti e stringhe numeriche rigorose.
- Supportare formati italiani e statunitensi, separatori decimali comma/punto e simboli valuta solo in posizione iniziale o finale.
- Rifiutare lettere incorporate, simboli valuta incorporati, raggruppamenti errati, spazi interni ed eccesso di decimali.
- Restituire zero per valori non validi; la conferma fattura continua a bloccare importi non positivi.

## Regressione

Test per formati locali, simboli valuta, OCR malformato, input numerici e valori non finiti. La regressione è inclusa in `npm test`.

## Sicurezza operativa

Solo codice e test. Nessun accesso o modifica a QA/Production, nessuna migrazione o distribuzione Supabase, nessun reset o servizio a pagamento.
