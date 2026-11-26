# Audit — validazione rigorosa della data fattura

## Difetto

La funzione usata in conferma fattura sostituiva una data mancante con la data odierna. Il controllo successivo sul valore vuoto risultava quindi inefficace. Inoltre, le date italiane impossibili potevano essere normalizzate in modo errato e le stringhe non interpretabili potevano generare eccezioni durante la conversione ISO.

## Correzione

- Data mancante o non supportata: valore vuoto, così la conferma fattura viene bloccata prima delle scritture contabili.
- Formati accettati: `DD/MM/YYYY`, `DD-MM-YYYY` e `YYYY-MM-DD`.
- Verifica effettiva del calendario, inclusi anni bisestili.
- Nessun fallback automatico alla data odierna.

## Regressione

Test per valori mancanti, formati italiani e ISO, giorno impossibile, mese impossibile, anno bisestile e formati non supportati. Test incluso in `npm test`.

## Sicurezza operativa

Solo codice e test. Nessun accesso o modifica a QA/Production, nessuna migrazione o distribuzione Supabase, nessun reset o servizio a pagamento.
