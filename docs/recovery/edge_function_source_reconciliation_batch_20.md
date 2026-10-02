# BETHAG — riconciliazione puntuale sorgenti Edge Function — batch 20

**Progetto Supabase:** `tctcgptrsmvgajqjgnev` (lettura soltanto)  
**Repository:** `federico1bartolucci-ctrl/BETHAG`  
**Branch esaminato:** `bethag-migration-repair`  
**Esito:** nessuna delle sette funzioni attive ha, allo stato del confronto, una corrispondenza byte-per-byte tra sorgente distribuito e sorgente presente nel branch; tre funzioni attive non hanno il sorgente nel tree.

## Confronto tra distribuzione e repository

| Edge Function | Supabase | Versione | verify_jwt | Sorgente nel branch | Corrispondenza esatta |
|---|---|---:|---|---|---|
| `bethag-send-email` | ACTIVE | 7 | true | Sì | No |
| `bethag-invite-collaborator` | ACTIVE | 4 | true | Sì | No |
| `bethag-invite-resident` | ACTIVE | 7 | true | Sì | No |
| `delete-account` | ACTIVE | 1 | true | Sì | No |
| `bethag-ai-condominium` | ACTIVE | 5 | true | No | Non confrontabile |
| `bethag-ai-document` | ACTIVE | 3 | true | No | Non confrontabile |
| `bethag-resend-webhook` | ACTIVE | 2 | false | No | Non confrontabile |

Il confronto è stato eseguito sui contenuti `index.ts` recuperati da Supabase e dai quattro file presenti nel branch, verificando anche una normalizzazione degli spazi. Anche dopo la normalizzazione, i quattro sorgenti non coincidono. La differenza non dimostra da sola un difetto funzionale o una modifica non autorizzata: il branch può essere più recente, più vecchio o derivare da un diverso processo di deploy. Serve un confronto semantico riga per riga e una decisione esplicita su quale versione debba essere la fonte autorevole.

## Rilievi specifici

- `bethag-send-email`: il sorgente nel repository è sensibilmente più lungo di quello distribuito e contiene riferimenti aggiuntivi, tra cui `portal_access`, non rilevati nella versione distribuita. Va verificato se sono cambiati i controlli destinatari, le autorizzazioni e la gestione dei retry.
- `bethag-invite-collaborator`: entrambi i sorgenti contengono controlli di autenticazione e appartenenza workspace, ma il testo differisce e va riconciliato prima di considerare il codice versionato come riproducibile.
- `bethag-invite-resident`: dimensioni quasi uguali, ma numero di righe e contenuto non identici; la somiglianza dimensionale non è prova di equivalenza.
- `delete-account`: il file Git è più lungo e strutturato diversamente dal sorgente distribuito; occorre una revisione specifica di autorizzazione, conferma, pulizia applicativa e trattamento dell'ultimo amministratore.
- Le tre funzioni AI/webhook sono attive ma non hanno sorgente nel branch; i contenuti distribuiti recuperati sono utili per la riconciliazione, ma non vanno copiati in una migration né distribuiti senza revisione.

## Disposizione

1. Congelare il deploy delle Edge Function finché non è stabilita la fonte autorevole.
2. Recuperare e conservare i sorgenti distribuiti tramite un percorso approvato, separandoli dai file Git già esistenti.
3. Effettuare un diff semantico, verificando autenticazione, ruoli/moduli, workspace/tenant scope, uso di segreti, error handling, idempotenza e contratti di risposta del client.
4. Correggere e versionare il sorgente concordato nel branch di recupero; fare review prima di qualunque merge o deploy.
5. Eseguire test con identità e dati sintetici in ambiente QA isolato, inclusi retry e casi di autorizzazione negata.

**Limiti:** controllo di inventario e confronto statico. Nessuna funzione è stata invocata; nessun segreto è stato letto; non sono stati eseguiti test runtime, deploy o modifiche a Supabase. La baseline migrazioni e la certificazione al lancio restano bloccate dai gate già documentati.
