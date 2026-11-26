# Audit — paginazione dei controlli di eliminazione dei lavori

## Difetto

La cancellazione di un lavoro leggeva in modo non paginato i SAL e i collegamenti ai documenti, poi interrogava i documenti collegati con un'unica clausola `IN`. Oltre il limite predefinito PostgREST (tipicamente 1.000 righe), un SAL con scritture contabili o una fattura confermata potevano restare fuori dal controllo e non impedire la cancellazione.

## Correzione

- Lettura keyset paginata per SAL, collegamenti documentali e documenti.
- Filtri workspace/lavoro mantenuti e batch di ID documento limitati a 500.
- Fallimento chiuso in caso di errore su una pagina successiva, cursore non valido o riferimento documento non valido/non sicuro.
- Nessuna cancellazione autorizzata usando risultati parziali.

## Regressione

Il test ricrea il limite a 1.000 righe e posiziona la fattura confermata alla riga 1.001; verifica che la paginazione la recuperi, che i dati di altri workspace siano esclusi e che errori di pagina o ID non validi interrompano il controllo.

## Sicurezza operativa

Modifica limitata al codice e ai test. Nessuna lettura o scrittura su QA/Production, nessuna migrazione o distribuzione Supabase, nessun reset o servizio a pagamento.
