# Allineamento client ↔ RPC critiche — 2026-10-03

## Evidenze dal branch `main`
Lettura di `src/main.tsx` e `src/lib/bethagBackend.ts`:
- `src/main.tsx` chiama `supabase.rpc("admin_approve_portal_registration", ...)` per approvare una richiesta portale (circa riga 2913 nel contenuto consultato).
- Lo stesso file invoca `complete_portal_registration` durante la registrazione e il completamento della sessione.
- Non sono state trovate nel file `src/lib/bethagBackend.ts` chiamate alle RPC `confirm_condominium_member_transfer`, `close_condominium_member_transfer` o `admin_approve_portal_registration`.
- Anche la ricerca del repository per i nomi esatti delle due RPC di trasferimento non ha prodotto corrispondenze. La funzione di subentro presente in produzione non risulta quindi collegata, sulla base del codice consultato, a una chiamata esplicita nel branch `main`. Potrebbero esistere chiamate in file/branch non consultati: questa evidenza non dimostra l'assenza assoluta nel progetto.

## Esposizione schema privato
La lettura di `list_tables` ha restituito le tabelle pubbliche, ma non fornisce la configurazione degli schemi esposti da PostgREST né i privilegi effettivi di USAGE/EXECUTE. Non è quindi possibile concludere da questa risposta se le routine `private.*` siano invocabili tramite API. Le chiamate dirette al database via catalog query per ACL/schema non hanno prodotto un risultato utilizzabile in questo passaggio.

## Conseguenza per la correzione
- La chiamata del client all'approvazione utilizza il wrapper pubblico: preservare tale contratto.
- Non aggiungere al client le RPC di trasferimento né alterare i grant finché non siano stati verificati i requisiti funzionali del flusso e l'esposizione API.
- Prossima verifica: acquisire da configurazione progetto/PostgREST gli schemi esposti e gli ACL; confrontare poi le RPC effettivamente usate con tutte le routine SECURITY DEFINER e preparare una migrazione mirata solo se la vulnerabilità è confermata.
- Nessuna modifica al database Production; il collaudo completo rimane alla fine della riconciliazione.


## Aggiornamento verifica ACL e chiamate — 2026-10-03 (secondo controllo)

La verifica read-only successiva ha accertato che il ruolo `authenticated` possiede `USAGE` sullo schema `private`, ma **non** possiede `EXECUTE` sulle tre implementazioni private verificate: `private.admin_approve_portal_registration`, `private.confirm_condominium_member_transfer` e `private.close_condominium_member_transfer`. Le tre RPC pubbliche risultano non eseguibili da `anon` ed eseguibili da `authenticated`. `service_role` risulta abilitato alle due RPC pubbliche di trasferimento e non all'approvazione. Questo restringe il rischio: il warning advisor sulle RPC pubbliche SECURITY DEFINER non costituisce da solo prova di bypass, e non è emersa esecuzione diretta delle implementazioni private da parte di `authenticated`.

Il client in `src/main.tsx` legge prima la richiesta e il membro, poi invoca il wrapper pubblico `admin_approve_portal_registration`; il controllo client su `email_mismatch` è una protezione UX, non un confine di sicurezza. La garanzia di autorizzazione deve quindi restare nel wrapper server-side, che verifica identità/email e autorizzazione amministrativa. L'implementazione privata non ripete integralmente il controllo di uguaglianza dell'email: evitare di esporla o concedere EXECUTE al ruolo client.

Nel branch `main`, il client espone la chiamata di approvazione ma non sono state trovate chiamate esplicite alle due RPC di trasferimento con i nomi esatti. Le funzioni SQL di trasferimento presenti nelle migrazioni e quelle effettivamente distribuite vanno confrontate prima di modificare grant o wrapper. Non applicare revoche generalizzate: confermare prima i consumatori legittimi, incluso backend/service role.

La migrazione `20260930320000_harden_portal_approval_rpc.sql` nel branch definisce una versione pubblica SECURITY DEFINER che non contiene, nel corpo mostrato, il controllo di uguaglianza email verificata presente nel wrapper di produzione descritto dall'audit catalogo. Non trattarla come definizione corrente né applicarla isolatamente: la sequenza delle migrazioni successive e la definizione runtime effettiva devono prevalere. La differenza è registrata come divergenza di cronologia da risolvere nella riconciliazione.

**Esito operativo:** nessuna DDL eseguita e nessun grant modificato. Mantenere le implementazioni `private.*` non eseguibili dai ruoli client; ricostruire la definizione pubblica finale da catalogo e dalle migrazioni in ordine, poi introdurre una correzione puntuale soltanto dopo verifica del contratto client e dei privilegi richiesti.
