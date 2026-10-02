# Portal registration — verifica identità e conflitti

**Ambiente osservato:** Supabase production project `tctcgptrsmvgajqjgnev`  
**Tipo di verifica:** sola lettura di definizioni SQL installate e conteggi aggregati  
**Esito:** difetti logici confermati; nessuna modifica applicata.

## Stato dei dati osservato

- Richieste in stato `pending` o `email_mismatch`: 0.
- Membri attivi con `user_id` valorizzato: 0.
- Membri attivi senza `user_id`: 5.
- Membri attivi senza condominio associato: 0.
- Gruppi di membri attivi che condividono lo stesso `user_id`: 0.
- Richieste aperte prive di workspace o utente richiedente: 0.

I conteggi descrivono lo stato al momento della query e non certificano i flussi runtime.

## Definizioni installate

Le funzioni operative risiedono nello schema `private` e sono `SECURITY DEFINER`, con `search_path = ''`.

### `private.complete_portal_registration(text,text,text)`

La funzione:
- considera candidati attivi usando nome **oppure** codice fiscale, senza richiedere la corrispondenza dell'email del membro con l'email autenticata;
- se trova un solo candidato, assegna direttamente `condominium_members.user_id` all'utente corrente senza verificare un eventuale collegamento preesistente;
- aggiorna richieste `pending` e `email_mismatch` con la stessa email normalizzata, senza restringere l'aggiornamento a `requested_user_id`, workspace e membro;
- non blocca una richiesta aperta per applicare un controllo concorrente di idempotenza.

### `private.admin_approve_portal_registration(uuid,uuid)`

La funzione:
- blocca la richiesta con `FOR UPDATE`;
- verifica che la richiesta appartenga al workspace del membro e che il richiedente abbia il permesso di gestione del modulo portale;
- rifiuta richieste senza `requested_user_id` e condòmini archiviati;
- assegna direttamente `condominium_members.user_id` al richiedente senza un controllo di conflitto sul collegamento esistente.

La funzione amministrativa è quindi più circoscritta sullo scope della richiesta, ma non protegge ancora l'associazione identità già presente.

## Correzioni necessarie prima della migrazione

1. **Matching deterministico:** richiedere email verificata corrispondente all'email del membro e almeno un identificatore anagrafico coerente; se nome/CF restituiscono più candidati, non associare automaticamente.
2. **Protezione del legame:** bloccare l'operazione se il membro è già associato a un diverso `user_id`. Un trasferimento account deve essere un flusso separato, esplicito e tracciato.
3. **Scope delle richieste:** ogni aggiornamento deve riferirsi all'ID della richiesta, all'utente autenticato, al workspace e al membro effettivamente validati; non approvare in blocco per sola uguaglianza email.
4. **Idempotenza/concorrenza:** definire una chiave univoca coerente per una richiesta aperta e gestire esplicitamente il conflitto, restituendo l'ID della richiesta esistente anziché un `request_id` nullo.
5. **Atomicità:** validare prima tutte le condizioni; mutare membro, accesso portale, workspace membership, profilo e richiesta nella stessa transazione della funzione.
6. **Email mismatch:** mantenere lo stato di verifica amministrativa senza permettere che la scelta di un membro sovrascriva silenziosamente un legame esistente.
7. **Privilegi:** conservare la separazione tra wrapper pubblico e implementazione privata; verificare grant EXECUTE e autorizzazione manager prima di rilasciare.

## Casi di test richiesti su ambiente isolato

- Email verificata, nome/CF ed email membro coerenti, membro non associato → associazione singola.
- Email diversa ma nome/CF coincidenti → nessuna associazione automatica; richiesta mismatch.
- Membro già collegato allo stesso utente → risposta idempotente senza duplicare accessi o richieste.
- Membro già collegato a utente differente → errore controllato, nessuna tabella modificata.
- Più membri candidati con dati simili → richiesta di revisione, nessun match automatico.
- Due richieste simultanee dello stesso utente e stesso membro → una sola richiesta aperta e un solo legame.
- Richieste con stessa email ma utenti/workspace/membri diversi → nessuna approvazione incrociata.
- Amministratore fuori workspace o senza permesso portale → rifiuto senza effetti collaterali.
- Condominio archiviato → rifiuto senza effetti collaterali.
- Email con maiuscole/spazi → normalizzazione coerente con indice e dati persistiti.

## Gate e limiti

La baseline delle migrazioni non è ancora riconciliata integralmente: la cronologia produzione e i file disponibili non coincidono. Questo documento non è una migrazione eseguibile e non autorizza il deploy. Prima di applicare la correzione occorre ricostruire la provenienza della definizione installata, controllare i wrapper e i vincoli effettivi, quindi preparare una migrazione sul ramo sorgente coerente e provarla su un database isolato riproducibile.

Nessuna modifica è stata applicata al database di produzione, al branch `main` o al deploy.
