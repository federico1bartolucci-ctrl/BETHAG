# Audit — reset del modulo pratiche legali in Contabilità

**Data:** 27 novembre 2026

## Difetto riproducibile

Il pulsante "+ Nuova pratica" apriva il modulo impostando `editingCase` a null, ma lasciava invariato `caseForm`. Dopo aver modificato una pratica esistente o aver annullato una bozza, il successivo inserimento poteva mostrare e salvare i dati della pratica precedente. Anche annullamento e salvataggio lasciavano lo stato del form disponibile per il riutilizzo.

## Correzione

- Introdurre `createEmptyCaseForm(date = new Date())` con campi vuoti, stato `Aperto` e data locale corrente.
- Usare la factory per lo stato iniziale.
- Azzerare il form all'apertura di una nuova pratica, dopo il salvataggio e quando l'utente annulla.
- Conservare il caricamento esplicito dei dati nel percorso `Modifica`.

## Regressione

`scripts/test-accounting-legal-case-form-reset.mjs` verifica reset all'apertura, al salvataggio e all'annullamento, permanenza del percorso di modifica, campi vuoti, data locale `Europe/Rome` e inclusione in `npm test`. Il test dei default contabili è aggiornato alla factory.

## Sicurezza

Nessun accesso o intervento su QA/Production, nessuna migrazione Supabase, nessun reset e nessun workflow manuale.
