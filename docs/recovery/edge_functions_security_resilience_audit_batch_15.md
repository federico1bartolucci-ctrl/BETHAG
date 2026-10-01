# BETHAG — audit delle Edge Functions — batch 15

**Branch:** `bethag-migration-repair`  
**Ambito:** revisione statica di quattro Edge Functions: invito collaboratore, invito condòmino, invio comunicazioni e cancellazione account.  
**Limiti:** nessun test runtime, nessuna chiamata di invio email, nessuna modifica a database o produzione.

## Esito sintetico

Le funzioni di invito verificano l'identità con `auth.getUser()` e richiedono un'amministrazione attiva del workspace indicato. L'invio email verifica membership, permesso comunicazioni per collaboratori, appartenenza del condominio e appartenenza dei destinatari. Sono comunque emersi punti da collaudare o correggere prima della certificazione.

## Rilievi

### E-01 — Invito collaboratore e profilo globale

La funzione verifica il ruolo admin attivo nel workspace, poi utilizza il client privilegiato per aggiornare `profiles` e fare upsert su `workspace_members`. Il profilo è globale all'utente, mentre i permessi collaboratore sono workspace-scoped. La funzione preserva un ruolo globale admin ma assegna il ruolo collaborator nella membership del workspace.

**Da provare:** stesso utente in più workspace, account già residente, account già collaboratore, conflitti fra ruolo globale e membership, errore a metà sequenza. Gli aggiornamenti di profilo e membership non appaiono racchiusi in un'unica transazione applicativa: un errore successivo può lasciare stato parziale dopo l'invito.

### E-02 — Invito condòmino e gestione errori

La funzione limita la selezione del membro a condominio e workspace verificati e rifiuta il membro disattivato. Successivamente aggiorna profilo, membro e `portal_access` tramite più richieste separate; un errore intermedio può lasciare un'associazione parziale. L'aggiornamento dei metadati Auth eseguito quando l'utente è stato appena invitato non controlla il risultato d'errore restituito da `updateUserById`.

**Da provare/correggere:** controllare esplicitamente l'errore di aggiornamento metadati; rendere il flusso recuperabile/idempotente; testare account preesistenti, email condivise, co-intestatari, invito già pendente, membership multiple, retry ed errori dopo ogni scrittura. La funzione non dovrebbe segnalare esito complessivo positivo se uno step critico non è stato confermato.

### E-03 — Invio email: privacy e idempotenza

La funzione autorizza admin e collaboratori con permesso `comunicazioni`, verifica che il condominio appartenga al workspace e limita i destinatari agli indirizzi attivi associati al condominio. Deduplica gli indirizzi.

Il payload invia l'intero array destinatari nel campo `to` della singola richiesta Resend. In base al comportamento del provider e al formato del messaggio, i destinatari potrebbero essere esposti reciprocamente nell'intestazione; il requisito di riservatezza va definito e verificato. Se l'invio esterno riesce ma l'aggiornamento della comunicazione fallisce, un retry può reinviare il messaggio, perché non è visibile un meccanismo idempotente end-to-end.

**Da provare/correggere:** invio individuale o BCC secondo il requisito privacy; limite massimo e validazione degli indirizzi/dimensione payload; idempotency key e stato di invio affidabile; timeout, retry, risposta provider e fallimento DB post-invio; audit e trattamento degli indirizzi nei log. Il controllo destinatari va testato contro email duplicate, varianti di maiuscole/spazi, membro disattivato e destinatario di altro workspace/condominio.

### E-04 — Cancellazione account

La funzione richiede autenticazione, conferma testuale e, se abilitato, codice personale; impedisce l'eliminazione quando l'utente è unico admin attivo in un workspace. La cancellazione Auth è distinta dalla cancellazione dei dati applicativi.

**Da provare:** validità e rate limiting del codice, gestione di più workspace, sessioni revocate, dati residui in profili/membership/portal access, retention, richieste privacy e recupero account. Il controllo “ultimo admin” e la cancellazione sono passaggi separati: una modifica concorrente alle membership richiede protezione transazionale o una procedura server-side atomica.

### E-05 — CORS e protezione di invocazione

Le prime tre funzioni impostano `Access-Control-Allow-Origin: *`; CORS non sostituisce autenticazione e autorizzazione, che sono presenti nel codice esaminato. La configurazione effettiva `verify_jwt`/JWT per ciascuna funzione non è stata verificata da questo controllo. Per `delete-account`, il wrapper `withSupabase({ auth: "user" })` applica un percorso autenticato, ma anche qui la configurazione distribuita non è stata verificata.

**Da provare:** configurazione distribuita, chiamate senza token/con token scaduto, OPTIONS, origine non autorizzata se si intende restringerla, invocazione diretta e abuso di volume. Non dedurre la sicurezza effettiva dalla sola configurazione CORS o dal sorgente.

## Matrice QA minima

| Funzione | Caso positivo | Casi negativi/di resilienza |
|---|---|---|
| Invita collaboratore | Admin attivo assegna permessi consentiti | Non admin, admin disattivo, workspace estraneo, ID/email confliggenti, permessi vuoti, errore parziale, retry |
| Invita condòmino | Admin invita membro attivo del proprio condominio | Membro inattivo, condominio/workspace errato, account esistente, più workspace, errore profilo/member/portal, metadati Auth falliti |
| Invia comunicazione | Admin e collaboratore autorizzato inviano a destinatari del condominio | Utente senza permesso, recipient esterno, destinatario inattivo, invio duplicato, provider ok/DB fail, payload eccessivo, privacy intestazioni |
| Elimina account | Utente conferma, non è unico admin | Codice errato/rate limit, ultimo admin, multi-workspace, concorrenza, residui e retention |

## Decisione

Le quattro funzioni hanno controlli di autorizzazione visibili nel sorgente, ma non sono runtime-certificate. I rilievi E-01–E-05 vanno trattati come gate di QA e, dove indicato, correzioni da implementare in branch separato e verificare in ambiente isolato. **Nessuna modifica al codice o alla produzione è stata effettuata.** La baseline QA rimane bloccata, quindi il lancio non è certificato.
