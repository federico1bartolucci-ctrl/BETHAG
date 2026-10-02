# Subentro: integrazione nel ramo di riparazione — gate tecnico
Data: 2026-10-03
Ramo analizzato: `bethag-migration-repair`
Rami di confronto: `feature/subentro-rpc-client-20261002`, `feature/preserve-member-database-uuid`

## Esito della verifica
Al primo audit il ramo `bethag-migration-repair` non conteneva l'integrazione frontend del subentro. In seguito è stato aggiunto `databaseId` al mapping del membro e al tipo `CondominiumMember`; il salvataggio anagrafico ora conserva inoltre l'UUID restituito da Supabase sia per un nuovo membro sia dopo una modifica. In `src/lib/bethagBackend.ts` sono stati introdotti i client helper validati per anteprima, conferma e chiusura delle RPC live. Questi interventi sono stati verificati nel sorgente remoto; l'interfaccia `src/main.tsx` non richiama ancora i helper, quindi il flusso utente non è ancora operativo.

La variante `feature/subentro-rpc-client-20261002` integra conferma e chiusura, ma non espone nel client l'anteprima contabile strutturata presente nella variante `feature/preserve-member-database-uuid`. Quest'ultima introduce `databaseId?: string` nel modello UI, le validazioni della risposta di anteprima e la schermata che mostra rate scadute, versamenti, spese straordinarie deliberate prima e dovute dopo e movimenti dell'unità.

## Bloccanti per un port selettivo sicuro
1. **Identità record:** il modello del ramo di riparazione mantiene `id: number` per la UI e ora aggiunge `databaseId?: string` per l'UUID Supabase. Il mapping in lettura e il salvataggio restituiscono/conservano l'UUID; il flusso UI deve ancora verificare che entrambi gli identificativi siano presenti e coerenti prima di invocare le RPC. Non usare un ID numerico convertito in stringa come UUID.
2. **Contratto anteprima:** integrare il tipo e il parser di `MemberTransferPreview` soltanto dopo aver verificato l'intera definizione SQL live e la corrispondenza di ogni campo/nullabilità. La UI alternativa si basa su campi specifici e non va considerata compatibile per sola somiglianza dei nomi.
3. **Autorizzazioni:** le RPC live autorizzano i gestori del modulo; una migrazione alternativa restringe le RPC ai soli admin. Questa migrazione non risulta deployata nella produzione osservata. La regola di prodotto deve essere resa uniforme tra interfaccia, RPC e policy prima del rilascio.
4. **Identità del subentrante:** il client alternativo non fornisce una prova che l'email inserita appartenga all'utente autenticato; la RPC live accetta un eventuale `p_incoming_user_id`. Non associare un account del portale sulla base del solo nominativo o dell'email digitata. Richiedere un flusso server-side di invito/accettazione con email verificata e controlli di conflitto.
5. **Chiusura contabile:** la funzione live blocca la chiusura in presenza di residui secondo un criterio diverso dalla migrazione alternativa che applica una data limite. Non portare quest'ultima né cambiare la funzione live senza una regola approvata su competenza, delibera, scadenza e pagamento, incluse le spese straordinarie deliberate prima ma esigibili dopo il rogito.
6. **Idempotenza e aggiornamento UI:** dopo una conferma server riuscita, la UI deve chiudere il form prima del refresh e non invitare a ripetere l'operazione se il refresh fallisce. Conservare l'ID del trasferimento e mostrare lo stato server aggiornato.

## Percorso d'integrazione
- Campo UUID database aggiunto e verificato nel mapping; il salvataggio ora conserva l'UUID restituito da Supabase. Resta da verificare il dato nel flusso UI e durante il refresh.
- Portare il client RPC con validazione stretta di UUID, data ISO reale, tipi e forma dei dati.
- Integrare l'anteprima contabile e distinguere esplicitamente valori informativi da importi imputabili al debitore.
- Collegare il flusso nel dettaglio condominio, limitando la capacità di conferma/chiusura alla regola di ruolo decisa.
- Risolvere lato database i controlli su identità, collegamenti preesistenti e concorrenza; poi sincronizzare i membri/unità/portale da dati server.
- Solo dopo il completamento di tutti i blocchi, eseguire build e collaudo end-to-end in un ambiente QA ripetibile.

## Limiti dell'intervento
Verifica GitHub e confronto delle fonti; nessuna modifica a SQL o dati Supabase, nessun deploy e nessun merge. Non è stato eseguito un build o un collaudo browser. Il collaudo finale resta rinviato fino alla risoluzione di tutti i problemi individuati, come richiesto.
