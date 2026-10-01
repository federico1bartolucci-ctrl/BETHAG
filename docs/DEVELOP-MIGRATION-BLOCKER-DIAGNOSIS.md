# BETHAG — Diagnosi blocco migrazioni del branch Supabase

**Rilevazione:** 1 ottobre 2026, log del branch `bethag-develop` (`wvokvcfglduxmjxlnfeh`) e repository `backup/pre-rollback-20261001`.  
**Intervento:** sola lettura; nessuna migrazione eseguita da questa verifica.

## Evidenza concreta

- Il registro Supabase Production restituisce 153 migrazioni; il registro del branch `bethag-develop` ne restituisce 37.
- Nei log `workflow_run_logs`, alle 13:45:57 UTC, il processo ha iniziato `20260928043547_restrict_data_api_table_grants.sql`.
- Alle 13:45:58 UTC la migrazione è fallita con `ERROR: relation "public.portal_access" does not exist (SQLSTATE 42P01)`, allo statement 0, durante un `REVOKE` che include `public.portal_access`.
- La ricerca nel branch GitHub `backup/pre-rollback-20261001` conferma che non sono presenti né `supabase/migrations/20260928043547_restrict_data_api_table_grants.sql` né `supabase/migrations/20260928021707_initial_bethag_backend.sql`.
- Il registro attuale del branch risulta leggibile e riporta 37 migrazioni; la risposta di stato del branch lo segnala `FUNCTIONS_DEPLOYED` e `ACTIVE_HEALTHY`. Questo stato di servizio non dimostra che la sequenza completa delle migrazioni sia riproducibile o che lo schema sia allineato.

## Diagnosi

Il blocco osservato è una dipendenza mancante nel percorso di bootstrap: una migrazione che revoca privilegi fa riferimento a `public.portal_access`, ma tale relazione non esiste nel database di sviluppo nel momento in cui la migrazione viene applicata. Il repository non contiene il file di migrazione che ha generato quell'operazione, e manca anche la migrazione iniziale registrata in Production. La ricostruzione Git e il registro remoto quindi non costituiscono, allo stato attuale, una catena completa e verificabile.

Non è dimostrato dai soli log se la causa immediata sia esclusivamente la migrazione iniziale mancante, l'ordine/insieme dei file distribuiti al branch o una storia preesistente parziale. Per attribuire la causa al singolo passaggio occorre confrontare il contenuto integrale della migrazione iniziale Production, il set esatto di file usato dal workflow e il registro dopo un bootstrap pulito.

## Correzione da preparare (non applicata)

1. Recuperare in modo read-only la definizione canonica completa di `initial_bethag_backend` e tutte le migrazioni Production non presenti nel repository, con hash e versioni.
2. Confrontare ogni migrazione remota con il file del repository, distinguendo file assenti, file rinominati, versioni duplicate e migrazioni con contenuto differente.
3. Ricostruire un manifest deterministico con ordine e dipendenze; la creazione di `portal_access` deve precedere ogni `GRANT`/`REVOKE`, policy, trigger o funzione che la referenzia.
4. Verificare che la pipeline di sviluppo utilizzi il manifest completo e che non mescoli migrazioni Production già registrate con versioni rinominate in modo ambiguo.
5. Solo dopo un controllo esplicito dell'isolamento e della perdita dati accettabile, eseguire il bootstrap su un ambiente sacrificabile, quindi verificare tutte le 153 versioni previste, schema, funzioni, trigger, grants e RLS.
6. Tenere separata la successiva promozione: nessuna migrazione deve essere applicata o unita in Production come parte della sola diagnosi.

## Esito

È stato individuato un errore SQL specifico e una lacuna certa nel repository: il file `20260928043547_restrict_data_api_table_grants.sql` referenziato dal log e la migrazione iniziale `20260928021707_initial_bethag_backend.sql` non sono presenti nel branch analizzato. Non ho tentato di creare una migrazione sostitutiva sulla base di ipotesi, perché questo potrebbe produrre uno schema apparentemente funzionante ma non equivalente alla Production.