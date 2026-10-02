# Security, registration e cancellazione — review batch 4

**Ambito:** revisione statica delle migrazioni `20260930480000`–`20260930550000` nel branch `bethag-migration-repair`. Documento di audit, non migrazione eseguibile.

## Esito sintetico

Sono stati esaminati i controlli di cancellazione definitiva, privilegi profilo, visibilità condominio/unità e registrazione/approvazione del portale. La lettura individua controlli utili di segregazione, ma anche condizioni che richiedono correzione o prova in ambiente QA isolato. Non sono stati eseguiti SQL, replay, test runtime o scritture su Supabase produzione.

## Riscontri

### 1. Cancellazione definitiva e richiesta portale
- `20260930480000_scope_condominium_delete_portal_requests.sql` restringe la rimozione delle richieste alle righe associate ai membri del condominio selezionato e verifica workspace, permesso del modulo, eventuale codice personale e lock del condominio.
- La funzione continua tuttavia a cancellare in modo definitivo numerose tabelle collegate, inclusi dati contabili, anagrafici, unità, documenti, assemblee, comunicazioni e audit log. È quindi un'operazione distruttiva distinta dall'archiviazione: verificare esplicità della conferma UI, retention, backup, FK complete e gestione degli oggetti Storage.
- `20260930540000_harden_condominium_delete_carryover_compensations.sql` aggiunge la cancellazione preventiva delle compensazioni e dei riporti fiscali, ma non cambia la natura distruttiva della RPC. Serve un collaudo sull'intero grafo delle dipendenze e una verifica che la cancellazione sia atomica in caso di errore.

### 2. Privilegi dei profili
- `20260930490000_harden_profile_column_permissions.sql` revoca l'UPDATE generale ad authenticated e concede l'aggiornamento delle sole colonne `full_name` ed `email`; revoca anche INSERT. La protezione effettiva dipende comunque dalle policy RLS e dai percorsi privilegiati delle funzioni `SECURITY DEFINER`.
- QA: tentare come utente autenticato aggiornamenti a ruolo, stato, ID e altri campi protetti; provare anche i flussi legittimi di registrazione e approvazione.

### 3. Coerenza workspace/unità
- `20260930510000_harden_unit_workspace_scope.sql` aggiunge un trigger di controllo tra workspace dell'unità e workspace del condominio e una pre-verifica dei dati già presenti.
- **Punto da correggere/verificare:** il confronto usa `NEW.workspace_id <> v_workspace`. In SQL, se uno dei valori è NULL, il confronto restituisce NULL e il ramo `IF` non scatta. Se `workspace_id` è obbligatorio, la NOT NULL constraint deve essere accertata; altrimenti usare un confronto NULL-safe (ad es. `IS DISTINCT FROM`) e testare insert/update con NULL.
- La pre-verifica usa una join e il confronto ordinario; va affiancata da controlli per riferimenti mancanti e valori NULL, ove lo schema li consenta.

### 4. Visibilità e archiviazione
- `20260930500000_harden_condominium_visibility.sql` sostituisce la policy SELECT per consentire accesso ai gestori autorizzati o ai residenti con accesso effettivo al condominio.
- `20260930550000_harden_archived_condominium_visibility.sql` esclude i condomini archiviati da alcuni percorsi del portale e dalle letture residenti di unità/membri.
- **Punto da verificare:** nel ramo di lettura dei membri con `user_id = auth.uid()`, la policy non richiede visibilmente `active = true`, mentre il ramo basato sull'e-mail lo richiede. Verificare se un membro disattivato ma ancora collegato a user_id possa leggere dati dopo disattivazione; uniformare la regola secondo il modello autorizzativo atteso.
- Testare separatamente admin, collaboratore con/senza modulo, residente attivo, residente disattivato, consiglio, identità non associata e condominio archiviato, includendo accessi diretti alle API.

### 5. Unicità email e registrazione
- `20260930520000_harden_portal_email_uniqueness.sql` introduce un indice univoco su `lower(email)` per workspace/condominio e rimuove il vecchio indice non case-insensitive. Prima del replay occorre individuare eventuali duplicati normalizzati.
- `20260930530000_fix_portal_registration_case_insensitive_upsert.sql` aggiorna le RPC di completamento e approvazione e usa `ON CONFLICT DO UPDATE` senza un target esplicito. Questo evita il riferimento al vecchio indice semplice, ma può intercettare qualsiasi vincolo univoco violato: QA deve dimostrare che l'upsert aggiorni esclusivamente il record portal_access appartenente alla stessa identità/workspace/condominio e non un record diverso.
- La ricerca automatica del candidato conta membri attivi che corrispondono al nome **oppure** al codice fiscale. Se i dati anagrafici sono duplicati o discordanti, la registrazione può restare in attesa o associare un candidato non univoco: collaudare nomi omonimi, CF duplicati, CF vuoto/malformato, spazi/maiuscole e combinazioni in cui nome e CF individuano persone diverse.
- La funzione di approvazione verifica stato richiesta, membro attivo, workspace e permesso portale, poi aggiorna più tabelle. Verificare atomicità, richieste concorrenti/già gestite, identità già collegata a un altro membro, e coerenza di `portal_access`, `workspace_members`, `profiles` e `portal_registration_requests`.
- L'assegnazione di un workspace di ripiego quando non è individuato il condominio va testata in installazioni multi-workspace: la richiesta non deve essere instradata verso un workspace arbitrario né esporre dati tra tenant.

## QA richiesto prima della certificazione

1. Verificare NOT NULL, FK e indici effettivi su unità, portal_access, richieste e profili; individuare duplicati email case-insensitive prima di applicare l'indice.
2. Provare inserimenti/aggiornamenti con workspace NULL o discordante, unità senza condominio e riferimenti cross-workspace.
3. Eseguire matrice RLS con identità sintetiche e accessi API diretti, inclusi membri disattivati e condomini archiviati.
4. Eseguire registrazione/approvazione concorrente, omonimie, CF discordanti, email con maiuscole/spazi, account già associati e richieste duplicate.
5. Provare cancellazione definitiva su un condominio sintetico con tutte le dipendenze, verificando rollback atomico, compensazioni, riporti, audit e Storage.
6. Confrontare risultati e privilegi prima/dopo replay in database QA usa-e-getta; nessuna prova va condotta sulla produzione.

## Limiti e stato

Review esclusivamente statica dei file elencati. Non certifica la semantica dell'intera cronologia, il replay pulito, il comportamento runtime o l'assenza di altri difetti. Il baseline QA resta bloccato finché non è completata la riconciliazione semantica e il replay isolato. Nessuna modifica è stata applicata a Supabase produzione, a `main`, né è stato eseguito merge o deploy.
