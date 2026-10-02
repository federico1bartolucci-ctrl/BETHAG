# Subentro: confronto delle RPC di produzione con le migrazioni alternative

Data verifica: 2026-10-03  
Progetto Supabase esaminato: produzione BETHAG  
Ramo sorgente alternativo: `feature/subentro-rpc-client-20261002`  
Ramo di ripristino: `bethag-migration-repair`

## Risultato del confronto

Le definizioni lette dal catalogo PostgreSQL in produzione confermano la presenza delle RPC pubbliche `confirm_condominium_member_transfer`, `close_condominium_member_transfer`, `preview_condominium_member_transfer` e `get_member_transfer_accounting_snapshot`, con delega alle funzioni private per conferma e chiusura.

### Chiusura contabile

La funzione privata di chiusura attualmente installata:
- verifica autenticazione, autorizzazione del workspace e stato `Confermato`;
- blocca la chiusura se esistono residui di rate, allocazioni o riporti fiscali del membro uscente;
- non filtra rate e allocazioni per data di scadenza rispetto alla data del subentro;
- archivia il membro uscente e porta il trasferimento a `Chiuso` solo dopo il superamento dei controlli.

La migrazione alternativa `20261002130000_close_transfer_financial_cutoff.sql` modifica il criterio per rate e allocazioni: considera bloccanti quelle senza data o con scadenza entro la data del trasferimento, e conserva i riporti fiscali aperti come blocco prudenziale. Questa versione non coincide con la funzione attualmente installata in produzione. Non è quindi corretto dichiarare che la chiusura per data limite sia già operativa.

### Conferma del trasferimento

La funzione privata di produzione:
- blocca la riga dell'unità durante la conferma;
- verifica che il membro uscente sia attivo, proprietario corrente dell'unità e non già in chiusura;
- impedisce un secondo trasferimento confermato/chiuso sulla stessa unità e data;
- salva uno snapshot contabile nel record del trasferimento;
- mantiene attivo il membro uscente in stato `In chiusura`, marca `current_owner=false`, disattiva il suo accesso al portale e inserisce il nuovo titolare.

La logica è coerente con l'evoluzione delle migrazioni alternative che preservano la storia e sincronizzano i riferimenti del proprietario corrente. Resta però da provare che l'intera sequenza sia corretta per tutti i casi di comproprietà, più unità per soggetto e associazioni di portale.

### Anteprima contabile

La RPC di anteprima presente in produzione restituisce i campi:
- `outstanding_before`, `paid_before`, `installments_before`;
- `extraordinary_deliberated_before_due_after`;
- `unit_expenses` e `review_flags`.

I campi corrispondono sostanzialmente a quelli utilizzati dall'interfaccia di anteprima individuata nel ramo `feature/preserve-member-database-uuid`. La corrispondenza dei nomi, da sola, non prova che i tipi TypeScript, i dati reali e la gestione di valori nulli siano corretti.

La RPC `get_member_transfer_accounting_snapshot` è presente, ma restituisce una struttura distinta dall'anteprima. Prima dell'integrazione va scelto un unico contratto applicativo e va evitato di confondere lo snapshot registrato al momento della conferma con un calcolo aggiornato in tempo reale.

## Blocchi da risolvere prima del porting

1. Definire formalmente il criterio di chiusura: data di competenza, data di scadenza, data di pagamento e gestione delle rate senza scadenza non sono equivalenti.
2. Definire come gestire spese straordinarie deliberate prima del rogito ma esigibili dopo, inclusa la responsabilità tra cedente e acquirente, senza automatismi che attribuiscano responsabilità legali non validate.
3. Verificare le tabelle e i riferimenti contabili effettivi per stabilire se la chiusura debba bloccare tutte le posizioni del soggetto o soltanto quelle attribuibili all'unità trasferita.
4. Confrontare tutte le revisioni SQL delle funzioni private e pubbliche con le definizioni di produzione, incluse ACL, wrapper, trigger, indici e dipendenze.
5. Integrare solo il client compatibile nel ramo di ripristino, con tipi espliciti per le risposte RPC, gestione del conflitto unità/data e refresh consistente.
6. Testare almeno: proprietario singolo, comproprietari, titolare con più unità, rate scadute e non scadute, pagamento parziale, spesa straordinaria deliberata prima con scadenza successiva, riporto fiscale aperto, doppio invio concorrente, account entrante non verificato e accesso portale.

## Azioni svolte e limiti

Le definizioni sono state lette dal catalogo del database di produzione in modalità di sola lettura e confrontate con le migrazioni disponibili nel ramo alternativo. Non sono state eseguite scritture SQL, migrazioni, merge o deploy. La migrazione di chiusura con cutoff è un candidato da valutare, non una modifica approvata né una correzione già applicata.

Il collaudo complessivo resta rinviato fino alla risoluzione dei blocchi sopra elencati.
