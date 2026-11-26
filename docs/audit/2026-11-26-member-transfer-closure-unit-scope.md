# Audit — allineamento della chiusura subentro all'unità selezionata

**Stato:** proposta tecnica in bozza; non approvata e non applicata a QA o Production.

## Difetto

La verifica finanziaria e la chiusura autorevole del subentro selezionavano rate, allocazioni straordinarie e riporti del cedente per workspace, condominio e membro, ma non sempre per l'unità del trasferimento. I trigger di scope baseline verificano separatamente l'appartenenza di membro e unità allo stesso workspace/condominio; non impongono che l'unità della riga contabile coincida con quella del membro.

Una riga contabile del cedente A, ma con `unit_id` dell'unità B, poteva quindi bloccare la chiusura del trasferimento di A. La correzione della sola anteprima (#555) non bastava: il controllo e la chiusura effettiva dovevano usare lo stesso perimetro.

## Correzione proposta

La funzione privata di verifica e quella privata di chiusura:
- filtrano rate, allocazioni e riporti collegati ai cedenti con `unit_id IS NULL OR unit_id = transfer.unit_id`;
- considerano separatamente i riporti non assegnati con `member_id IS NULL` e `unit_id = transfer.unit_id`;
- mantengono i record legacy collegati al membro ma privi di `unit_id`;
- mantengono invariato il comportamento dei trasferimenti di quota, che non richiedono chiusura delle posizioni finanziarie;
- lasciano invariato il blocco quando l'unità trasferita conserva effettivamente importi aperti.

Il candidato resta in `supabase/rebuild/drafts/`, fuori dalla catena canonica.

## Regressione PGlite

Il test riproduce i totali gonfiati della baseline con righe contabili del cedente A associate a unità B. Verifica poi che:
- il controllo corretto conteggi soltanto unità A e righe legacy senza unità;
- il trasferimento di quota mantenga il comportamento zero-balance;
- dopo aver chiuso le posizioni di A, il subentro di A possa chiudersi anche se B conserva debiti;
- il candidato resti fuori da `supabase/migrations`.

La suite usa PGlite locale e non accede a database remoti.

## Limiti

Questa integrazione riguarda soltanto il controllo e la chiusura finanziaria del subentro. Non modifica la funzione di anteprima già integrata da #555, non applica migrazioni a QA/Production e non attiva procedure di cutover.
