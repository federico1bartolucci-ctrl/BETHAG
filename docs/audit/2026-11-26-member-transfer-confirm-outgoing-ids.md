# Audit — validazione completa dei cedenti prima della conferma del subentro

**Stato:** proposta tecnica in bozza; non approvata e non applicata a QA o Production.

## Difetto

`private.confirm_condominium_member_transfer` verificava soltanto le righe effettivamente trovate con `id = ANY(v_outgoing_ids)`. Un UUID inesistente o un elemento JSON `null` non produceva una riga corrispondente e poteva quindi superare il controllo. La funzione poteva portare il cedente valido a `In chiusura`, creare il nuovo proprietario e registrare un trasferimento che la successiva chiusura autorevole avrebbe rifiutato.

Un secondo problema era il test di appartenenza del cedente principale con `NOT (id = ANY(array))`: la presenza di NULL può rendere il risultato SQL NULL e impedire l'inserimento del cedente principale nell'array.

## Correzione proposta

La funzione proposta, copiata dalla versione canonica corrente e modificata soltanto in questo punto:
- usa `array_position` per garantire che il cedente principale sia incluso anche quando l'array contiene NULL;
- blocca con `FOR UPDATE` i proprietari attivi idonei dell'unità;
- valida ogni elemento tramite `unnest`, rifiutando NULL, UUID inesistenti, membri inattivi, non proprietari, di altro condominio o di altra unità;
- esegue i controlli prima di aggiornare membri, accessi Portale, workspace members o inserire il nuovo proprietario e il trasferimento;
- mantiene il fallback al cedente principale quando l'array è vuoto;
- lascia invariato il successivo controllo autorevole in fase di chiusura.

Il candidato resta in `supabase/rebuild/drafts/`, fuori dalla catena canonica.

## Regressione PGlite

Il test:
- riproduce la conferma errata con UUID inesistente e NULL sulla funzione canonica precedente;
- verifica che la funzione corretta rifiuti entrambi prima di qualsiasi scrittura;
- verifica che un array valido che omette il cedente principale venga normalizzato includendolo;
- verifica che l'array vuoto continui a usare il cedente principale;
- verifica che la proposta resti fuori da `supabase/migrations`.

La suite usa PGlite locale e non accede a database remoti.

## Limiti

Questa integrazione estrae soltanto la validazione dell'array in conferma. Non include le altre modifiche di unit-scope/contabilità presenti nei branch storici #454/#455/#456. Nessuna migrazione è stata applicata a QA o Production.
