# BETHAG — verifica richiami UI/backend e copertura Edge Functions — batch 18

**Branch esaminato:** `bethag-migration-repair`  
**Commit esaminato:** `1a2df4188edda2e577ff79ba43ecd9cde5f440ac`  
**Tipo:** inventario statico dei richiami applicativi e dei file presenti nel repository. Nessuna invocazione reale, nessun deploy, nessuna modifica Supabase.

## Risultato sintetico

L’applicazione contiene richiami espliciti a sei nomi di Edge Function, ma nel repository sono presenti soltanto quattro directory di funzione. Due richiami AI non hanno una corrispondente implementazione nel tree Git esaminato.

| Funzione invocata dal client | Richiamo trovato | Implementazione nel branch | Esito statico |
|---|---|---|---|
| `bethag-invite-resident` | `src/main.tsx` | `supabase/functions/bethag-invite-resident/index.ts` | Presente |
| `bethag-invite-collaborator` | `src/main.tsx` | `supabase/functions/bethag-invite-collaborator/index.ts` | Presente |
| `bethag-send-email` | `src/main.tsx` | `supabase/functions/bethag-send-email/index.ts` | Presente |
| `delete-account` | `src/main.tsx` | `supabase/functions/delete-account/index.ts` | Presente |
| `bethag-ai-document` | `src/lib/bethagBackend.ts` | Non trovata nel tree del branch | Da verificare / possibile blocco |
| `bethag-ai-condominium` | `src/lib/bethagBackend.ts` | Non trovata nel tree del branch | Da verificare / possibile blocco |

Il tree GitHub del commit indicato non è risultato troncato e contiene solo le quattro directory elencate. Questo prova l’assenza delle due implementazioni dal repository a quel commit, non l’assenza di funzioni eventualmente create o distribuite direttamente nel progetto Supabase.

## Implicazioni e verifiche necessarie

1. Controllare nel pannello Supabase del progetto collegato se `bethag-ai-document` e `bethag-ai-condominium` risultano distribuite, attive e associate al progetto atteso.
2. Verificare per ciascuna funzione l’eventuale sorgente conservata fuori da Git, configurazione di autenticazione, segreti server-side e dipendenze AI.
3. Se non distribuite, recuperare il sorgente originale da backup o cronologia prima di ricostruirle. Non creare implementazioni sostitutive alla cieca: occorre rispettare contratto del payload, limiti di piano, autorizzazioni workspace, formati di risposta, trattamento dei documenti e gestione degli errori.
4. Eseguire in QA isolato prove positive e negative: utente autorizzato/non autorizzato, file non valido o eccessivo, errore provider, timeout, retry e doppio invio.
5. Aggiungere un controllo di coerenza che confronti i nomi di tutte le funzioni invocate dal client con le funzioni versionate nel repository e con la configurazione di deploy.

## Limiti dell’audit

- Revisione statica dei richiami presenti in `src/main.tsx` e `src/lib/bethagBackend.ts`, e delle directory in `supabase/functions`.
- Nessuna chiamata a endpoint Edge Functions, nessun documento inviato, nessuna verifica dello stato delle funzioni effettivamente distribuite.
- Nessuna verifica runtime di autenticazione, autorizzazione, limiti di utilizzo o provider AI.
- Nessuna modifica a codice applicativo, configurazione, database o ambiente di produzione.

## Stato

**Disallineamento repository/client da chiarire.** Le due funzioni AI sono un gate per certificare l’acquisizione documentale AI; la loro operatività non può essere dichiarata sulla sola base dei richiami client. La baseline migrazioni e il collaudo end-to-end restano non certificati.
