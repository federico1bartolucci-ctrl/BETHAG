# Revisione mirata — registrazione portale e prime modifiche di dominio

**Branch:** `bethag-migration-repair`  
**Tipo:** evidenza statica da file di migrazione; non eseguibile come piano di ripristino.

## Riscontri aggiuntivi

La lettura dei file disponibili conferma una sequenza di modifiche successive, non una definizione unica e stabile:

- `20260928093000_align_portal_request_access.sql` sostituisce helper di accesso al condominio; la correttezza dipende dalle tabelle e dagli helper invocati già presenti.
- `20260928153246_add_portal_access_unique_identity.sql` crea un indice univoco su workspace, condominio ed email normalizzata con `lower(trim(email))`.
- `20260928153301_fix_portal_registration_upsert.sql` sostituisce RPC di registrazione e approvazione e aggiorna membri, profili e richieste. È quindi una funzione con effetti su più entità e richiede test transazionali e di associazione identità.
- `20260928153422_normalize_portal_access_upsert_key.sql` elimina l'indice funzionale precedente e ne crea uno su email memorizzata direttamente. Il passaggio da chiave normalizzata a valore raw può essere sensibile a maiuscole/spazi se la normalizzazione dei dati non è garantita in modo uniforme.
- `20260928153526_route_unmatched_registration_single_workspace.sql` sostituisce nuovamente la RPC di registrazione: va confrontata con tutte le versioni successive e con il comportamento dell'indice effettivamente attivo.
- `20260928154000_handle_registration_email_mismatch.sql` modifica la constraint degli stati delle richieste; dalla lettura mirata non emerge una sostituzione del corpo RPC, perciò lo stato `email_mismatch` deve essere verificato nel percorso applicativo completo.
- `20260928160001_include_regolamento_inquilino.sql` sostituisce la funzione di assegnazione permessi portale: i permessi effettivi vanno provati per proprietario e inquilino.
- `20260928183000_harden_resident_portal_access.sql` e `20260929201500_fix_resident_portal_rls.sql` sostituiscono helper di accesso residenti: la verifica deve includere identità collegata, email, membro attivo, unità e workspace.
- `20260929110000_add_condominium_insurance_policies.sql` crea una nuova tabella con indici e RLS: prerequisiti autorizzativi devono esistere prima di applicare le policy.
- `20260929170500_remove_member_millesimi.sql` esegue un aggiornamento dati sui membri: va verificata la conservazione dei valori migrati verso le unità prima di considerare la modifica riproducibile.
- `20260929230443_sync_allocation_payment_status.sql` sostituisce la RPC di registrazione pagamenti e aggiorna rate e ripartizioni: richiede casi di pagamento parziale, saldo, storno e concorrenza.
- `20260930110000_accounting_consumption_and_installment_percentages.sql` crea regole di ripartizione con RLS; `20260930110100_allocation_criteria_scope.sql` modifica successivamente lo scope di unità e tabelle millesimali.

## Gate di verifica

1. Per ogni RPC sostituita, confrontare la versione iniziale e tutte le successive, registrando firma, dipendenze, privilegi EXECUTE, effetti collaterali e comportamento in caso di errore.
2. Verificare che la normalizzazione email sia coerente tra registrazione, indice univoco, profilo e membro; provare varianti con maiuscole/spazi e indirizzi già associati.
3. Verificare che ogni transizione di stato della richiesta abbia una transizione applicativa corrispondente e non lasci richieste pendenti o identità collegate in modo ambiguo.
4. Per i dati millesimali, effettuare una riconciliazione numerica prima/dopo su copia QA e impedire perdite silenziose.
5. Per i pagamenti, confrontare saldo delle rate, allocazioni e movimenti contabili prima/dopo; coprire doppio invio e rollback.

## Limiti

È stata eseguita una lettura statica mirata dei file elencati, non un'analisi completa dei 132 file, non un replay SQL e non un test runtime. Non è attestata la presenza o assenza degli effetti di ciascuna migrazione in produzione sulla sola base dei nomi dei file. Nessuna modifica a Supabase produzione, alla history delle migrazioni, a `main` o al deploy.
