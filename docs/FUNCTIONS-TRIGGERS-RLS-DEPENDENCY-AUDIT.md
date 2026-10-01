# BETHAG — Audit delle dipendenze di funzioni, trigger e RLS

**Data:** 1 ottobre 2026  
**Ambito:** catalogo Production acquisito e branch `backup/pre-rollback-20261001`.  
**Stato:** analisi documentale; nessuna funzione, policy o trigger applicato.

## Copertura documentale attuale

- Il catalogo Production elenca **85 funzioni pertinenti** (public/private) e **88 trigger non interni** sulle 27 tabelle mancanti.
- Il documento `PRODUCTION-FUNCTION-DEFINITIONS.md` contiene il corpo SQL di **14 funzioni selezionate**. Pertanto non è ancora disponibile nel repository il corpo completo delle funzioni censite, né una verifica completa dei rispettivi grants.
- La fotografia RLS contiene **62 policy**. La replica delle sole policy non è sufficiente: alcune chiamano helper nello schema `private`, altre dipendono da funzioni `SECURITY DEFINER` e tabelle del modello autorizzativo.
- La presenza di una firma o di un nome nel catalogo non dimostra che il relativo corpo sia presente nelle migrazioni del branch né che abbia la stessa definizione della Production.

## Dipendenze da risolvere

| Gruppo | Dipendenze obbligatorie | Rischio da verificare |
|---|---|---|
| Helper autorizzativi | `auth.uid()`, membership workspace, ruoli e permessi modulo; `private.can_access_workspace_module`, `private.can_manage_workspace_module`, `private.is_workspace_manager` e helper correlati | Un helper assente o con semantica diversa può bloccare gli utenti legittimi o ampliare l'accesso |
| Chiusura esercizi | esercizi, movimenti, rate, pagamenti, riporti e compensazioni | Doppia generazione, chiusura non atomica, modifica di esercizi chiusi |
| Riparti e rate | movimenti, unità, tabelle/valori millesimali, regole, letture e allocazioni | Scope errato, importi non riconciliati, rate duplicate o attribuite al soggetto sbagliato |
| Pagamenti e storni | rate, movimenti di pagamento, audit storni | Alterazione del nucleo storico, saldo pagato incoerente, storno senza motivazione/audit |
| Subentro | unità, membri, trasferimenti, rate, allocazioni, accessi portale e snapshot | Sovrapposizione di titolari, perdita dello storico, addebiti oltre la data effettiva |
| Lavori | lavori, documenti, SAL/progress, eventi, fornitori, fondi e libro giornale | Doppia contabilizzazione o collegamenti tra condomìni/workspace differenti |
| Audit e mutazioni archiviate | audit log, stato archivio, workspace/condominio | Modifica di archiviati o registrazioni non riconducibili al contesto corretto |

## Controlli necessari per ogni funzione

1. Acquisire il corpo completo e la firma esatta dalla fonte canonica; controllare overload e dipendenze chiamate.
2. Registrare schema, proprietario, linguaggio, volatilità, `SECURITY DEFINER`, `search_path`, privilegi `EXECUTE` per `PUBLIC`, `anon`, `authenticated` e ruoli interni.
3. Per ogni funzione privilegiata, verificare che l'identità sia autenticata e che il controllo workspace/condominio/modulo avvenga all'interno della funzione, non soltanto nell'interfaccia o nella policy chiamante.
4. Verificare l'uso di nomi qualificati e `search_path` sicuro; evitare risoluzione di oggetti tramite schemi non attendibili.
5. Per RPC di scrittura, testare chiamate dirette con ID appartenenti ad altro workspace/condominio, utente non membro, ruolo collaboratore senza permesso e utente residente.
6. Per ogni trigger, associare tabella, eventi, timing, funzione invocata e dipendenze; verificare che trigger simili non applichino regole in conflitto o in ordine inatteso.
7. Verificare atomicità e lock nelle operazioni multi-tabella, inclusi retry e chiamate concorrenti.
8. Comparare la definizione effettiva in sviluppo con la fotografia Production e registrare ogni differenza deliberata.

## Osservazioni di sicurezza da non perdere

- Le policy sono permissive salvo diversa indicazione e policy permissive multiple possono ampliare l'accesso effettivo. Vanno valutate insieme, non una alla volta.
- La policy `condominium_audit_log_read_manager` è destinata al ruolo `public` e usa `private.is_workspace_manager(workspace_id)`. La combinazione di ruolo SQL e helper va confermata come intenzionale e testata anche per chiamate anonime.
- `communication_recipients` prevede gestione da parte di chi ha permesso sul modulo comunicazioni e lettura della propria consegna. Verificare che il filtro su `user_id` non permetta di vedere destinatari diversi e che gli utenti non possano autoassegnarsi `status`, `provider_message_id` o timestamp di consegna.
- I metadati del catalogo segnalano funzioni `SECURITY DEFINER` eseguibili da `authenticated`. Non è di per sé prova di vulnerabilità, ma ogni RPC esposta richiede revisione del corpo e test di autorizzazione.
- Le funzioni che modificano chiusure, pagamenti, trasferimenti e valori millesimali devono essere coerenti con i trigger di protezione e con i vincoli di integrità.

## Gate prima della migrazione

La ricostruzione non è pronta per l'esecuzione finché non sono soddisfatti tutti i punti seguenti:

- corpi SQL e grants acquisiti per tutte le funzioni necessarie;
- ogni funzione invocata da policy/trigger esiste prima dell'oggetto che la richiama;
- ogni trigger è ricreato una sola volta e collegato alla funzione corretta;
- RLS e grants verificati con test positivi e negativi per ogni ruolo;
- test di concorrenza e transazionalità per chiusure, rate, pagamenti, storni e subentri;
- migrazioni riprodotte da zero in un progetto di sviluppo isolato e schema risultante confrontato con i cataloghi;
- nessuna modifica a Production senza un piano di rilascio e autorizzazione esplicita separati.

## Esito

Questo audit rende esplicita una lacuna di copertura: i cataloghi descrivono l'ampiezza della superficie logica e di sicurezza, ma i 14 corpi SQL selezionati non bastano a ricostruire fedelmente tutte le 85 funzioni pertinenti. Il lavoro successivo deve acquisire i corpi mancanti e collegarli alle migrazioni effettive, invece di creare una migrazione che replichi soltanto nomi e firme.