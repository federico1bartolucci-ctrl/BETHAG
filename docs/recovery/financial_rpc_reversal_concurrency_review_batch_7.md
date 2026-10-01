# RPC finanziarie, storno pagamenti e concorrenza — review batch 7

**Ambito:** revisione statica di 8 migrazioni selezionate del branch `bethag-migration-repair`. Documento di audit, non migrazione eseguibile.

## Riscontri

### 1. Revoca dell'esecuzione anonima
Le migrazioni `20261001063800_lock_down_financial_rpc_anon_execute.sql`, `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql` e `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` revocano EXECUTE da `anon` e/o `public` per RPC contabili, amministrative, archiviazione, ripristino e cancellazione.

La revoca non costituisce da sola una concessione esplicita a `authenticated`: occorre controllare i privilegi effettivi risultanti e confermare che le RPC destinate alla UI restino invocabili da utenti autenticati autorizzati. Verificare anche overload e firme differenti, funzioni private richiamabili indirettamente, grants ereditati e policy RLS delle tabelle sottostanti. Eseguire test con ruoli anon, authenticated, gestore senza modulo e gestore con modulo.

### 2. Protezione dei campi privilegiati del profilo
`20261001081700_protect_profile_privilege_fields.sql` installa un trigger BEFORE UPDATE che rifiuta modifiche a `role` e `active` quando `auth.uid()` è valorizzato, e revoca EXECUTE pubblico/anon sulla funzione trigger.

La guardia protegge i campi indipendentemente dal valore di `id` della riga aggiornata; questo è prudenziale per il client, ma i flussi amministrativi/di registrazione che devono modificare tali campi dipendono da un contesto in cui `auth.uid()` sia NULL o da un percorso esplicitamente privilegiato. Va verificato che il comportamento effettivo sia compatibile con bootstrap, approvazione e disattivazione utenti e che non esista un bypass involontario. Non assumere che SECURITY DEFINER da solo azzeri `auth.uid()`.

### 3. Rigenerazione dei riporti fiscali
`20261001082000_fix_fiscal_carryover_regeneration.sql` verifica autenticazione, modulo contabilità, appartenenza degli esercizi a workspace/condominio, origine chiusa, destinazione aperta e data successiva; blocca la rigenerazione se i riporti esistenti hanno compensazioni.

La funzione calcola il saldo generale da saldo iniziale più entrate meno uscite, ma i riporti individuali sono calcolati separatamente dalle rate meno pagamenti. I due totali possono divergere se esistono movimenti non rappresentati da rate, rettifiche, storni o partite fuori dal perimetro delle rate. Prima di certificare, definire e verificare la regola di quadratura tra saldo di apertura destinazione, saldo di chiusura origine e somma dei riporti individuali.
La funzione cancella e ricrea i riporti della coppia origine/destinazione quando non risultano compensazioni: verificare la presenza di note, riconciliazioni o altri riferimenti collegati che potrebbero essere persi. Provare inoltre richieste simultanee di rigenerazione, destinazioni non contigue, esercizi sovrapposti e valori negativi/positivi.

### 4. Storno e audit del pagamento
`20261001083000_payment_reversal_audit_and_reconciliation.sql` introduce una tabella audit con identificativo univoco del pagamento originale, copia dei dati essenziali e motivazione obbligatoria. La RPC verifica autenticazione, permesso contabile, ragione dello storno, appartenenza del pagamento e stato dell'esercizio; registra l'audit e rimuove il movimento nella stessa transazione. Il vincolo UNIQUE su `original_payment_id` contribuisce a prevenire storni duplicati; il lock sul movimento serializza tentativi concorrenti sullo stesso pagamento.

Punti di verifica:
- il controllo esercizio blocca solo quando lo stato è esattamente `Chiuso`; se la relazione all'esercizio manca o lo stato è NULL, il ramo non blocca. Accertare FK/NOT NULL e decidere il comportamento fail-closed per dati incoerenti;
- la tabella audit ha RLS e lettura per gestori contabili, ma il test deve confermare che la visibilità sia limitata al workspace corretto e che nessun ruolo possa modificare/eliminare l'audit;
- confermare che l'operazione sia atomica: errore nell'audit o nel trigger di sincronizzazione deve annullare sia la cancellazione sia l'audit;
- verificare il riallineamento di rata e allocazioni dopo lo storno, inclusi pagamenti parziali, saldo completo, più allocazioni, proprietari multipli, trasferimento/subentro e ripetizione;
- verificare che motivazione, autore e timestamp siano sempre valorizzati e che la UI mostri il movimento stornato senza farlo apparire come pagamento attivo;
- testare il caso in cui la rata o il condominio siano archiviati o modificati durante il flusso.

La funzione di sincronizzazione aggiorna lo stato rata sulla base della somma dei movimenti residui e ripartisce i pagamenti sulle allocazioni. Per le rate con unità nulla usa la corrispondenza del proprietario e distribuisce il pagato sulle allocazioni ordinate per ID: serve verificare che questa priorità sia coerente con la regola contabile e non attribuisca pagamenti a un comproprietario errato.

### 5. Concorrenza nella generazione rate
`20261001083500_lock_concurrent_installment_generation.sql` aggiunge un advisory transaction lock per workspace/condominio/voce contabile nella RPC di generazione rate pianificate, poi ricontrolla se la spesa possiede già rate. Il lock transazionale serializza le richieste concorrenti che usano la stessa chiave e si rilascia a commit/rollback.

Il lock è nella funzione `generate_installments_from_allocations_schedule`. Va accertato se tutte le altre RPC/overload che generano rate sulla medesima spesa acquisiscono lo stesso lock: se una funzione non pianificata non lo usa, può ancora concorrere con la generazione schedulata. Testare inoltre collisioni hash teoriche, retry, errori a metà ciclo e unicità lato database come difesa aggiuntiva.

### 6. Indici comunicazioni
`20261001063435_final_performance_indexes_communication_recipients.sql` elimina un indice sull'avanzamento lavori e aggiunge indici su destinatari per condominio e utente. La modifica è prestazionale: verificare che l'indice rimosso non sia richiesto da query o vincoli, e misurare i piani delle query di elenco/invio comunicazioni con dataset realistici. Gli indici non sostituiscono i controlli di tenant/RLS.

## Gate QA

1. Inventario grants effettivi per tutte le firme/overload e test negativo/positivo con anon e authenticated.
2. Prove di bootstrap, registrazione, approvazione, modifica ruolo e disattivazione con i ruoli e contesti previsti.
3. Quadratura indipendente tra libro mastro, rate, pagamenti, riporti e saldo iniziale/finale.
4. Rigenerazione ripetuta e concorrente dei riporti con e senza compensazioni e annotazioni collegate.
5. Storno parziale/totale, retry e concorrenza, verificando audit immutabile e rollback atomico.
6. Generazione rate concorrente tramite ogni RPC/overload, per la stessa spesa e per spese diverse.
7. Test UI e API per visibilità di pagamenti attivi/stornati e segregazione multi-workspace.

## Limiti e stato

Revisione statica dei file elencati; nessun SQL o replay è stato eseguito, nessun test runtime o di concorrenza è stato condotto. Non certifica l'intera cronologia né la configurazione effettiva dei grants in produzione. Il baseline QA resta bloccato fino a riconciliazione semantica completa e replay in ambiente isolato. Nessuna scrittura su Supabase produzione, modifica a `main`, merge o deploy.
