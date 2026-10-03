# BETHAG — modello obiettivo per identità e membership del Portale

Data: 2026-10-03  
Stato: proposta tecnica derivata dall'ispezione runtime; non applicata.

## Problemi runtime da risolvere

- `private.complete_portal_registration` può assegnare l'utente autenticato a un membro attivo senza verificare che il membro sia già associato a un altro account.
- La funzione privata è direttamente eseguibile da `authenticated`; il wrapper pubblico è invoker e delega alla funzione privata. Una revoca ACL isolata interromperebbe il percorso applicativo.
- `workspace_members` ha PK `(workspace_id,user_id)`, quindi contiene una sola riga per account/workspace; gli upsert residenti aggiornano `condominium_id` e `legacy_id`, sostituendo il contesto precedente.
- Le verifiche di accesso residenti al Portale usano `portal_access` e il membro associato; le autorizzazioni generali dei moduli usano `workspace_members`.
- `portal_access` ha indici univoci workspace/legacy e workspace/condominio/e-mail normalizzata. Questi vincoli vanno confrontati con i casi reali di comproprietà, più unità e più profili con e-mail condivisa prima di cambiare il modello.

## Principi invarianti

1. Un utente può avere più legami residenti validi, anche con più membri, unità o condomìni, senza che un legame sostituisca gli altri.
2. Un membro anagrafico non può essere reclamato da un secondo account autenticato senza una procedura amministrativa esplicita, tracciata e verificata.
3. La conferma dell'e-mail dell'account è necessaria ma non dimostra, da sola, l'identità rispetto all'anagrafica condominiale.
4. I permessi sono valutati sul membro e sul condominio pertinenti; i ruoli globali di amministratore/collaboratore restano distinti dai ruoli di proprietario/inquilino/consigliere.
5. La registrazione e l'approvazione sono atomiche, idempotenti e protette da concorrenza; gli errori non devono lasciare profili, membership o accessi parzialmente aggiornati.
6. I riferimenti contabili e storici restano legati al membro/unità originari; la registrazione al portale non deve riscrivere la titolarità storica.

## Modello logico raccomandato

- Conservare `workspace_members` come membership a livello workspace e fonte per ruoli globali e permessi dei collaboratori. Per i residenti non usarne `condominium_id/legacy_id` come rappresentazione completa delle associazioni condominiali.
- Usare una relazione dedicata di identità residente, concettualmente `portal_member_accounts(member_id, user_id, status, verified_at, created_at, updated_at)`, con FK al membro e all'utente, stato esplicito e audit. Il vincolo univoco va scelto dopo la decisione di prodotto: impedire più account attivi per lo stesso membro, ma non imporre una relazione globale uno-a-uno tra utente e membro.
- Mantenere `portal_access` come proiezione/entitlement per singolo condominio e membro, con `member_id` obbligatorio per i nuovi collegamenti e permessi derivati dal ruolo anagrafico. Valutare indici univoci in base a `member_id` e al contesto; non assumere che l'e-mail sia una chiave d'identità.
- Migrare le relazioni esistenti con un report preliminare di duplicati, collisioni e righe senza `member_id`; nessuna pulizia automatica distruttiva. Le righe ambigue restano sospese per riconciliazione amministrativa.

## Sequenza d'implementazione proposta

1. Inventariare dati effettivi e dipendenze: duplicati per account/membro/condominio, vincoli FK, viste, RPC, trigger, RLS e tutti i consumer applicativi di `workspace_members` e `portal_access`.
2. Definire casi accettati in una matrice: comproprietari, proprietario e inquilino, stessa persona su più unità, stesso account su più condomìni nello stesso workspace, e-mail condivisa, membro già associato e cambio e-mail.
3. Introdurre la relazione dedicata e policy/RPC server-side in una migrazione additiva; mantenere compatibilità di lettura durante la transizione.
4. Sostituire i flussi di registrazione automatica e approvazione con funzioni server-side che verificano e-mail confermata, ambito workspace, stato del condominio, identità non conflittuale, membro selezionato e autorizzazione del gestore; bloccare righe e gestire duplicati nella stessa transazione.
5. Revocare EXECUTE client sulle implementazioni private solo dopo aver predisposto wrapper `SECURITY DEFINER` con `search_path` vuoto, controllo `auth.uid()`, grants minimi e test di regressione.
6. Aggiornare UI, selezione del condominio attivo, sincronizzazione/backup e risoluzione del ruolo, evitando di inferire il condominio dal singolo record `workspace_members`.
7. Collaudare in ambiente isolato con dati sintetici e casi negativi/concorrenti; solo dopo esito positivo valutare una migrazione controllata e il rilascio, con backup e piano di rollback.

## Criteri di accettazione

- Il tentativo di collegare un membro già associato a un altro account viene rifiutato senza modifiche collaterali.
- Lo stesso account può accedere a più membri/condomìni autorizzati senza perdita di associazioni precedenti.
- I permessi di inquilino non includono pagamenti straordinari; quelli di proprietario sono determinati dal ruolo del membro pertinente.
- Una richiesta mismatch non può essere approvata su un membro diverso da quello abbinato, e ogni correzione anagrafica è verificabile e tracciata.
- Richieste duplicate o concorrenti producono un solo collegamento valido; nessuna approvazione parziale.
- L'archiviazione o la disattivazione del membro/condominio revoca l'accesso pertinente senza disattivare gli altri legami attivi dell'utente.
- Le membership admin/collaborator e i permessi globali dello workspace non vengono degradati da un'operazione residente.

## Limiti e stato

Questa è una proposta architetturale, non una dichiarazione che il modello sia già implementato. È stata redatta sulla base delle definizioni runtime consultate e del codice applicativo sul branch di riparazione. Non sono stati letti o modificati dati di utenti reali; non sono state applicate migrazioni, eseguiti test, build, typecheck o collaudi browser. La migrazione deve attendere inventario dei consumer e ambiente isolato.
