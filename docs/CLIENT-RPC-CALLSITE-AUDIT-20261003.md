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
