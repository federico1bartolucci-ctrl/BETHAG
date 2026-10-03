# Verifica puntuale routine critiche — 2026-10-03

## Perimetro
Lettura delle definizioni effettivamente installate nel database BETHAG Production tramite catalogo PostgreSQL. Nessuna funzione è stata eseguita e non sono state apportate modifiche al database. La ricerca delle routine nel codice SQL del branch `main` non ha restituito corrispondenze, quindi non è possibile attestare la parità con una migrazione versionata.

## Approvazione accesso portale

Sono presenti due livelli:
- `public.admin_approve_portal_registration(uuid, uuid)` è una funzione `SECURITY DEFINER` con `search_path TO ''`. Verifica che l'account autenticato abbia email confermata, che questa corrisponda alla richiesta e al membro, che la richiesta/condominio siano coerenti e che l'operatore possa gestire il modulo Portale; quindi delega alla routine privata.
- `private.admin_approve_portal_registration(uuid, uuid)` è anch'essa `SECURITY DEFINER` con `search_path TO ''`, ma la sua implementazione non ripete il controllo di email confermata né il confronto con l'email dell'utente autenticato. Verifica invece l'autenticazione, la richiesta, il membro attivo, il workspace, l'archiviazione e il permesso di gestione, quindi aggiorna le associazioni e approva la richiesta.

**Punto di verifica prioritario:** nei precedenti cataloghi di privilegi risultava EXECUTE concesso a `authenticated` su routine dello schema `private`. Questo, da solo, non prova che la funzione sia invocabile tramite API: occorre verificare anche l'esposizione dello schema `private`, USAGE e ACL effettivi. Se la routine privata è raggiungibile direttamente da client autenticati, il percorso privato può eludere i controlli aggiuntivi della funzione pubblica. Non modificare i grant prima di aver verificato configurazione API e chiamate client.

## Subentro / trasferimento

- `public.confirm_condominium_member_transfer(...)` rifiuta un `p_incoming_user_id` non nullo con `INCOMING_IDENTITY_REQUIRES_VERIFICATION`, poi delega alla routine privata passando `null` per l'identità entrante.
- `private.confirm_condominium_member_transfer(...)` controlla autenticazione e autorizzazione sul workspace, blocca la riga dell'unità, verifica che il cedente sia proprietario attivo dell'unità e impedisce duplicati nella stessa data e un altro proprietario attivo. Registra uno snapshot contabile, mette il cedente “In chiusura”, disattiva il suo accesso portale, crea il nuovo proprietario e registra il trasferimento come “Confermato”.
- `public.close_condominium_member_transfer(uuid)` delega alla routine privata.
- `private.close_condominium_member_transfer(uuid)` richiede che il trasferimento sia “Confermato” e che non restino rate, allocazioni o riporti con saldo aperto; solo allora archivia il cedente e marca il trasferimento “Chiuso”.

**Punti di riconciliazione:** verificare i privilegi di accesso diretto alle routine private e la coerenza delle chiamate dal client; verificare inoltre che il blocco alla chiusura per qualsiasi saldo residuo sia coerente con la regola di continuità contabile concordata per il rogito. Lo snapshot preserva dati e residui, ma non effettua una riallocazione automatica dei debiti tra cedente e acquirente; la funzione segnala infatti che la verifica della responsabilità legale è richiesta.

## Esito operativo
1. Non emerge una base sufficiente per applicare una revoca generalizzata dei privilegi: potrebbe interrompere RPC legittime.
2. Prima di una migrazione correttiva occorre acquisire la configurazione degli schemi esposti dall'API e gli ACL/USAGE effettivi, poi confrontare le chiamate client con i wrapper pubblici.
3. Le definizioni di produzione non sono ancora riconciliate con una catena di migrazioni completa in `main`; non vanno convertite in una migrazione incrementale senza controllare dipendenze, firme e stato delle installazioni.
4. Nessuna modifica Production; collaudo integrale rinviato al termine della riconciliazione, come richiesto.
