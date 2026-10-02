# Sicurezza account, intake condominiale e criteri di riparto — review batch 8

**Ambito:** revisione statica di migrazioni selezionate del branch `bethag-migration-repair`. Documento di analisi, non script da eseguire.

## Riscontri

### 1. Codice personale e cancellazione
`20260930090000_optional_account_security.sql` conserva un hash bcrypt del codice personale, limita la lunghezza e richiede autenticazione per impostazione/verifica. Il codice personale è però un controllo aggiuntivo, non deve sostituire autenticazione, autorizzazione del modulo o conferma esplicita di un'azione irreversibile. Prima del rilascio verificare:
- rate limiting e gestione dei tentativi falliti della RPC di verifica;
- assenza di esposizione dell'hash tramite SELECT, viste, log o payload;
- comportamento quando il codice è disabilitato, assente o viene cambiato;
- che il client non possa usare la verifica come prova di autorizzazione riutilizzabile.

La stessa migrazione definisce una RPC `delete_condominium` che elimina in sequenza richieste, accessi portale, comunicazioni, attività, fornitori, assemblee, scadenze, documenti, membri, unità e condominio. È cancellazione permanente, non archiviazione. La sequenza non mostra un passaggio esplicito per file in Storage né una conservazione documentale/contabile. Va confrontata con la successiva hard-delete migration e con il grafo FK completo; non va abilitata come normale alternativa all'archiviazione senza conferma, retention e test di rollback.

### 2. Letture di consumo e generazione rate
`20260930110000_accounting_consumption_and_installment_percentages.sql` introduce regole di riparto e letture con controlli su valori non negativi, periodo e progressione della lettura. La generazione delle rate valida numero e ordine delle scadenze, percentuali e appartenenza degli esercizi; assegna l'eventuale residuo di arrotondamento all'ultima rata.

La funzione di generazione delle allocazioni da consumo cancella le allocazioni della spesa e le ricrea sulla base delle letture, distribuendo i centesimi residui. La cancellazione è preceduta da un controllo sull'esistenza di rate, ma la sicurezza finale dipende anche dai trigger di integrità successivi. Testare in transazione:
- letture duplicate, meter diversi, periodi sovrapposti, servizio con spazi/maiuscole differenti;
- letture nulle o a zero, più letture per unità, consumo positivo con charge_amount nullo/zero e unità prive di letture;
- quadratura al centesimo con molte unità e valori frazionari;
- rigenerazione con allocazioni pregresse, rate, pagamenti, storni o storico collegato;
- scadenze distribuite tra più esercizi, esercizi sovrapposti e limiti del piano rateale.

La tabella delle letture usa una chiave univoca comprendente period_start e period_end, che possono essere NULL. Nei database PostgreSQL ordinari, una UNIQUE consente più righe con NULL nelle colonne chiave: occorre verificare se questo sia voluto o se serva un vincolo/indice che tratti NULL come valore non distinto. Verificare inoltre la coerenza workspace/condominio/unità/esercizio tramite FK e trigger, non solo tramite RLS.

### 3. Ambito delle tabelle millesimali
`20260930110100_allocation_criteria_scope.sql` aggiunge modalità all/units/buildings e sostituisce la RPC di riparto. La versione `20260930120000_fix_building_scope_allocation_rpc.sql` amplia la corrispondenza del fabbricato usando anche campi JSON legacy; questa scelta migliora la compatibilità ma può produrre differenze tra il codice normalizzato e i valori storici presenti nel JSON.

La funzione controlla la completezza del numero di valori per unità, la somma delle quote eleggibili e la presenza di altri riparti/rate; quindi cancella e ricrea le allocazioni della stessa tabella. Da provare:
- unità selezionate inesistenti, appartenenti ad altro condominio o archiviate;
- fabbricati con spazi, maiuscole/minuscole, codice normalizzato e fallback JSON discordanti;
- valori esclusi, pari a zero, mancanti o duplicati;
- tabella con quote che sommano al totale dichiarato ma non al totale convenzionale previsto dal condominio;
- differenza tra conteggio delle unità/quote (che può includere quote escluse) e somma delle quote effettivamente ripartite;
- doppio riparto concorrente della stessa spesa, variazione della tabella tra preview e conferma e riparto già pagato.

Il controllo `v_value_count = v_unit_count` conta anche le quote escluse, mentre la somma considera soltanto quote non escluse e positive. Può essere una regola corretta se ogni unità deve avere comunque una riga esplicita, ma deve essere confermata come requisito e riflessa nella UI.

### 4. Intake di creazione condominio
`20260930125903_condominium_creation_intakes.sql` crea una coda di acquisizione con dati estratti, struttura, errori e avvisi in JSON, e RLS basata sul modulo `condomini`. La conferma è rappresentata da status, autore e timestamp, ma questa migrazione non definisce da sola il processo di validazione/conferma né la creazione atomica delle entità definitive.

Verificare:
- transizioni ammesse tra Bozza, Da verificare, Confermato e Annullato;
- coerenza obbligatoria tra status Confermato, confirmed_by e confirmed_at;
- validazione server-side di JSON, riferimenti a documenti e struttura catastale prima della creazione;
- prevenzione di doppia conferma/doppio condominio, retry e concorrenza;
- segregazione per workspace e visibilità degli allegati in Storage;
- conservazione della provenienza dei dati AI/importati e correzione manuale auditabile.

### 5. Protezione delle funzioni trigger e riporti fiscali
Le migrazioni `20260930183000_harden_millesimal_trigger_function_execute.sql`, `20260930212000_revoke_trigger_security_definer_execute.sql` e `20260930213000_revoke_trigger_security_definer_execute_explicit_roles.sql` revocano l'esecuzione API delle funzioni interne richiamate da trigger. La versione con ruoli espliciti è più chiara nel rimuovere EXECUTE anche da authenticated; resta da controllare che nessuna di queste funzioni sia invocata direttamente dalla UI o da altre RPC come endpoint previsto e che i trigger continuino a eseguirsi correttamente.

`20260930203000_harden_fiscal_carryover_access.sql` revoca le scritture dirette sulle partite riportate e sulle compensazioni, lasciando la lettura agli utenti autenticati. Occorre verificare che tutti i flussi legittimi di generazione, compensazione, rigenerazione e hard-delete utilizzino RPC/privilegi coerenti e che nessun grant residuo consenta modifiche dirette.

`20260930204000_protect_fiscal_year_deletion.sql` impedisce la cancellazione di esercizi con movimenti, rate, budget, letture o riporti, oltre a bloccare esercizi chiusi. Confrontare l'elenco delle dipendenze con tutte le FK e le tabelle contabili introdotte successivamente, incluse compensazioni, fondi e audit; le FK possono bloccare comunque, ma il messaggio e il percorso di gestione potrebbero non essere uniformi.

### 6. Ottimizzazione RLS assicurazioni
`20260930194500_optimize_insurance_rls_auth_calls.sql` ottimizza la policy di lettura per gestori con accesso al modulo e residenti/consiglieri con accesso portale attivo. L'ottimizzazione va confrontata semanticamente con la policy precedente: ruolo, workspace, condominio, email JWT e identità utente devono mantenere lo stesso perimetro. Eseguire test per utenti senza collegamento, accessi disattivati, email differente, residente di altro condominio e gestore senza permesso.

## Gate QA

1. Test di codice personale con rate limit, hash non esposto e autorizzazione distinta dal codice.
2. Simulazione cancellazione condominio solo in QA con controllo di tutte le tabelle e Storage; verificare rollback e differenza rispetto all'archiviazione.
3. Test di consumo con dati incompleti, duplicati, multipli e arrotondamenti, verificando quadratura al centesimo.
4. Test di scope millesimale all/unità/fabbricati, quote escluse e dati legacy non normalizzati.
5. Conferma intake concorrente, idempotenza, dati malformati, audit e segregazione workspace.
6. Verifica grants effettivi delle funzioni trigger, RPC e riporti per anon/authenticated.
7. Confronto semantico RLS assicurazioni prima/dopo ottimizzazione e test con identità sintetiche.

## Limiti e stato

Revisione statica selettiva. Nessun replay SQL, test runtime, test concorrente o scrittura su QA/produzione è stato eseguito. Non equivale a certificazione completa della cronologia. Il baseline QA resta bloccato fino alla riconciliazione semantica complessiva e al replay riuscito in un ambiente isolato. Nessuna modifica a `main`, merge o deploy.
