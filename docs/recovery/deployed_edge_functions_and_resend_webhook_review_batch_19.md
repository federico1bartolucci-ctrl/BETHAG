# BETHAG — verifica distribuzione Edge Functions e webhook Resend — batch 19

**Progetto interrogato in sola lettura:** `tctcgptrsmvgajqjgnev`  
**Repository/branch:** `federico1bartolucci-ctrl/BETHAG` / `bethag-migration-repair`  
**Tipo:** controllo metadati di distribuzione e lettura statica dei sorgenti distribuiti. Nessuna invocazione, modifica o deploy.

## Correzione del rilievo precedente

Nel tree Git del branch risultavano soltanto quattro directory Edge Function; tuttavia la lettura diretta dell'inventario del progetto Supabase conferma che le due funzioni AI sono effettivamente distribuite e attive nel progetto interrogato. Il rilievo corretto è quindi **sorgente AI non versionato nel branch esaminato, ma funzione presente in Supabase**, non funzione sicuramente assente dall'ambiente.

## Inventario distribuito

| Slug | Stato rilevato | Versione | verify_jwt |
|---|---:|---:|---:|
| `bethag-send-email` | ACTIVE | 7 | true |
| `bethag-invite-collaborator` | ACTIVE | 4 | true |
| `bethag-invite-resident` | ACTIVE | 7 | true |
| `delete-account` | ACTIVE | 1 | true |
| `bethag-ai-condominium` | ACTIVE | 5 | true |
| `bethag-ai-document` | ACTIVE | 3 | true |
| `bethag-resend-webhook` | ACTIVE | 2 | false |

I metadati attestano lo stato e la versione dichiarati dal progetto al momento della lettura. Non costituiscono un test di invocazione o una garanzia di corretto comportamento.

## Verifica statica dei sorgenti AI distribuiti

Per `bethag-ai-document` e `bethag-ai-condominium` il sorgente distribuito è stato recuperato in lettura e confrontato per struttura con le chiamate client:
- entrambe richiedono un header Authorization e verificano l'utente tramite `auth.getUser()`;
- entrambe verificano l'appartenenza attiva a `workspace_members` e applicano un controllo di ruolo/modulo;
- entrambe richiedono uno `workspaceId`, limitano il percorso Storage al prefisso workspace e leggono dal bucket `bethag-documents`;
- entrambe utilizzano una variabile server-side per la chiave OpenAI, senza inserirla nel client.

La verifica è statica: non sono stati controllati valori dei segreti, risposte del provider, comportamento effettivo con JWT reali, limiti di consumo, timeout o scenari di errore. La presenza di un controllo nel sorgente non equivale alla sua prova runtime.

## Webhook Resend

La funzione `bethag-resend-webhook` è ACTIVE e ha `verify_jwt=false`. Il sorgente distribuito mostra una verifica alternativa della firma tramite intestazioni Svix e `RESEND_WEBHOOK_SIGNING_SECRET`, prima di invocare `apply_resend_communication_event` con un client server-side. La disattivazione della verifica JWT è quindi coerente con un endpoint webhook autenticato tramite firma, ma la sicurezza effettiva dipende dalla corretta configurazione del signing secret e dall'idempotenza del RPC.

Da collaudare in ambiente isolato:
- firma mancante o non valida, payload alterato e timestamp non valido/scaduto;
- evento duplicato e retry del provider;
- evento sconosciuto o incompleto;
- errore DB dopo verifica della firma e risposta HTTP;
- associazione tra provider message ID, evento e comunicazione, evitando aggiornamenti cross-tenant.

Non sono stati inviati webhook di prova e non sono stati letti o modificati i segreti.

## Disallineamento di versionamento

Le due funzioni AI sono attive su Supabase, ma i rispettivi sorgenti non sono presenti nel tree Git esaminato. Questo genera un rischio di drift: la versione operativa non è ricostruibile dal branch e non può essere sottoposta a revisione ripetibile o deploy controllato tramite il repository. Occorre recuperare il sorgente distribuito in un percorso approvato, verificarlo, eliminare eventuali segreti dal contenuto e versionarlo con una procedura tracciata. Nessun deploy va eseguito durante questa riconciliazione.

## Stato e prossimi gate

- **Presenza funzioni AI in Supabase:** confermata dai metadati ACTIVE.
- **Corrispondenza sorgente AI ↔ repository:** non raggiunta.
- **Autenticazione/autorizzazione runtime:** non testata.
- **Webhook Resend:** firma Svix visibile nel sorgente, test end-to-end non eseguito.
- **Baseline migrazioni e collaudo complessivo:** ancora non certificati.

Prossimo passo sicuro: riconciliare i sorgenti effettivamente distribuiti con Git e la configurazione di deploy; quindi preparare test runtime con identità e dati sintetici in un ambiente QA isolato. Produzione resta in sola lettura; nessun reset, migration, invio email, invocazione AI, merge o deploy è stato effettuato.
