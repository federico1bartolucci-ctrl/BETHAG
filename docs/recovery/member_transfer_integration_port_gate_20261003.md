# Subentro: integrazione nel ramo di riparazione — gate tecnico
Data: 2026-10-03
Ramo analizzato: `bethag-migration-repair`
Rami di confronto: `feature/subentro-rpc-client-20261002`, `feature/preserve-member-database-uuid`

## Esito della verifica
Il ramo `bethag-migration-repair` non contiene l'integrazione frontend del subentro nei moduli esaminati: `src/main.tsx` non importa né richiama le RPC `confirm_condominium_member_transfer`, `preview_condominium_member_transfer` o `close_condominium_member_transfer`; il tipo `CondominiumMember` non espone un identificativo UUID DB separato dal suo ID numerico legacy.

La variante `feature/subentro-rpc-client-20261002` integra conferma e chiusura, ma non espone nel client l'anteprima contabile strutturata presente nella variante `feature/preserve-member-database-uuid`. Quest'ultima introduce `databaseId?: string` nel modello UI, le validazioni della risposta di anteprima e la schermata che mostra rate scadute, versamenti, spese straordinarie deliberate prima e dovute dopo e movimenti dell'unità.

## Bloccanti per un port selettivo sicuro
1. **Identità record:** il modello del ramo di riparazione ha `id: number` e `unitId?: string`; prima di collegare le RPC va ricostruito e verificato il mapping stabile tra ID legacy UI e UUID Supabase del membro. Non usare un ID numerico convertito in stringa come UUID.
2. **Contratto anteprima:** integrare il tipo e il parser di `MemberTransferPreview` soltanto dopo aver verificato l'intera definizione SQL live e la corrispondenza di ogni campo/nullabilità. La UI alternativa si basa su campi specifici e non va considerata compatibile per sola somiglianza dei nomi.
3. **Autorizzazioni:** le RPC live autorizzano i gestori del modulo; una migrazione alternativa restringe le RPC ai soli admin. Questa migrazione non risulta deployata nella produzione osservata. La regola di prodotto deve essere resa uniforme tra interfaccia, RPC e policy prima del rilascio.
4. **Identità del subentrante:** il client alternativo non fornisce una prova che l'email inserita appartenga all'utente autenticato; la RPC live accetta un eventuale `p_incoming_user_id`. Non associare un account del portale sulla base del solo nominativo o dell'email digitata. Richiedere un flusso server-side di invito/accettazione con email verificata e controlli di conflitto.
5. **Chiusura contabile:** la funzione live blocca la chiusura in presenza di residui secondo un criterio diverso dalla migrazione alternativa che applica una data limite. Non portare quest'ultima né cambiare la funzione live senza una regola approvata su competenza, delibera, scadenza e pagamento, incluse le spese straordinarie deliberate prima ma esigibili dopo il rogito.
6. **Idempotenza e aggiornamento UI:** dopo una conferma server riuscita, la UI deve chiudere il form prima del refresh e non invitare a ripetere l'operazione se il refresh fallisce. Conservare l'ID del trasferimento e mostrare lo stato server aggiornato.

## Percorso d'integrazione
- Prima aggiungere e verificare il campo UUID database nel mapping dei membri, senza cambiare l'ID legacy usato dalle relazioni UI.
- Portare il client RPC con validazione stretta di UUID, data ISO reale, tipi e forma dei dati.
- Integrare l'anteprima contabile e distinguere esplicitamente valori informativi da importi imputabili al debitore.
- Collegare il flusso nel dettaglio condominio, limitando la capacità di conferma/chiusura alla regola di ruolo decisa.
- Risolvere lato database i controlli su identità, collegamenti preesistenti e concorrenza; poi sincronizzare i membri/unità/portale da dati server.
- Solo dopo il completamento di tutti i blocchi, eseguire build e collaudo end-to-end in un ambiente QA ripetibile.

## Limiti dell'intervento
Verifica GitHub e confronto delle fonti; nessuna modifica a SQL o dati Supabase, nessun deploy e nessun merge. Non è stato eseguito un build o un collaudo browser. Il collaudo finale resta rinviato fino alla risoluzione di tutti i problemi individuati, come richiesto.
