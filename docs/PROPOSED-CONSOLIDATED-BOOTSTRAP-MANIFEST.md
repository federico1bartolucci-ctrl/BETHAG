# BETHAG — Manifesto proposto per il bootstrap consolidato

**Ramo:** `backup/pre-rollback-20261001`  
**Stato:** piano tecnico non eseguibile, non applicato.  
**Scopo:** definire una sequenza di ricostruzione che evita di applicare il DDL Production insieme a migrazioni che già creano o alterano gli stessi oggetti.

## Regola di composizione

Il DDL generato da Production è una fotografia dello schema finale, mentre i 129 file SQL sono una sequenza incrementale. Non vanno concatenati. Per ogni oggetto si deve scegliere una sola strategia:
- **bootstrap finale**: la definizione completa è introdotta nel bootstrap e le migrazioni successive vengono trasformate in verifiche/no-op o rimosse dalla sequenza ricostruita;
- **bootstrap minimo + migrazione incrementale**: il bootstrap crea la forma iniziale verificata e le migrazioni la portano alla forma finale;
- **oggetto non fondativo**: resta nella migrazione funzionale che lo introduce, dopo aver garantito tutte le dipendenze.

Nessuna migrazione può essere considerata idempotente soltanto perché usa `IF NOT EXISTS`: tale clausola non riconcilia colonne, default, vincoli, policy o funzioni divergenti.

## Sequenza di lavoro proposta

| Fase | Oggetti | Condizioni per passare alla fase successiva |
|---|---|---|
| 0 — prerequisiti | Bootstrap auth/workspace, profili, condomini, unità, membri, documenti, comunicazioni, assemblee e helper di autorizzazione | DDL originale o fotografia completa verificata; PK/FK e grants di base documentati |
| 1 — fondazioni contabili | Esercizi fiscali, impostazioni contabili, tabelle millesimali e valori, fornitori, fondi | FK verso oggetti di fase 0 risolte; unicità e scope workspace/condominio verificati |
| 2 — movimenti e lavori | Libro giornale, budget, adempimenti fiscali, pratiche legali, registro, lavori | Tutte le FK e relazioni con fornitori/documenti/fondi/assemblee risolte |
| 3 — riparti e consumi | Riparti, regole di allocazione, letture, intake manuale/AI | Tabelle e RPC di allocazione disponibili; intake separato dai dati definitivi; controlli di somma e scope |
| 4 — rate e pagamenti | Rate, movimenti di pagamento, audit storni | Rate collegate a riparti e/o movimenti secondo modello; pagamenti parziali e storni riconciliati |
| 5 — chiusura e riporto | Riporti fiscali e compensazioni | Chiusura atomica; esercizi sorgente/destinazione bloccati correttamente; nessuna rigenerazione duplicata |
| 6 — passaggi e genealogia | Trasferimenti membri, snapshot contabili, trasformazioni catastali, item e snapshot unità | Date efficaci, storico immutabile, ownership attuale distinta dalle posizioni cessate; conferma esplicita e tracciata |
| 7 — sicurezza e automazioni | Funzioni RPC, trigger, policy RLS, grants/revokes, indici finali | Tutti gli helper esistono; privilegi minimi; funzioni `SECURITY DEFINER` con `search_path` fissato e autorizzazione interna |
| 8 — collaudo | Test SQL, RLS e scenari applicativi | Confronto cataloghi, test negativi/positivi per ruolo, contabilità quadrata e nessun errore di migrazione |

Le fasi indicano l'ordine di dipendenza, non una promessa che tutti gli oggetti siano già mappati completamente. L'ordine preciso dei singoli vincoli va ricavato dal grafo FK; i vincoli ciclici vanno aggiunti dopo la creazione delle tabelle.

## Sovrapposizioni da risolvere prima di creare le migration

| Oggetto | File già presenti | Decisione richiesta |
|---|---|---|
| `condominium_allocation_rules` | `20260930110000_accounting_consumption_and_installment_percentages.sql`, `20260930241000_allocation_rules_and_consumption.sql` | Confrontare colonne, constraint, indici, policy e logica; conservare una sola introduzione e mantenere soltanto le successive differenze funzionali |
| `condominium_consumption_readings` | gli stessi due file | Come sopra; verificare che l'introduzione non perda campi o trigger |
| `condominium_member_transfers` | DDL fondativo proposto, `20261001104500_add_condominium_member_transfer.sql` | Scegliere bootstrap o migrazione funzionale; preservare evoluzioni di funzione e policy, non duplicare la tabella |
| `condominium_millesimal_tables` | DDL fondativo proposto, `20260930110000_allocation_criteria_scope.sql` | La fotografia include colonne di scope; la migrazione incrementale deve essere mantenuta solo se il bootstrap è deliberatamente precedente a tali colonne |
| `condominium_unit_transformations` e `condominium_unit_transformation_items` | `20261001095000_add_unit_cadastral_transformations.sql` e successive | Non sono nel gruppo delle 27 tabelle mancanti: mantenere la sequenza funzionale, ma controllare dipendenze, snapshot e trigger prima di applicarla |

## Punti di sicurezza emersi dalla fotografia RLS

- La proposta contiene 62 policy e abilita RLS sulle 27 tabelle, ma non è un sostituto dei grants e dei controlli applicativi.
- Le policy si combinano tra loro; policy permissive duplicate o più ampie possono ampliare l'accesso effettivo.
- La policy `condominium_audit_log_read_manager` risulta indirizzata a `public` e usa `private.is_workspace_manager(workspace_id)`. Prima del bootstrap verificare se questa esposizione è intenzionale e se la funzione helper copre esattamente i ruoli ammessi.
- Le policy per destinatari comunicazioni comprendono sia accesso manager al modulo comunicazioni sia lettura della propria consegna. Testare che il destinatario non possa leggere dati di altri utenti o alterare lo stato di consegna.
- Ogni RPC `SECURITY DEFINER` deve essere esaminata insieme ai suoi `EXECUTE` grants, al `search_path`, ai controlli su workspace/modulo e alle chiamate indirette da policy/trigger.

## Gate di accettazione

1. Ogni tabella finale ha una sola definizione canonica e coincide con la fotografia Production per colonne, tipi, nullabilità, default, PK, FK, check, unique, exclusion e indici, salvo differenze motivate e documentate.
2. Ogni policy e grant ha un proprietario funzionale e un test esplicito per ruolo; nessuna tabella sensibile resta senza RLS.
3. Nessuna migrazione fa riferimento a oggetti non ancora creati; tutti i timestamp sono univoci e l'ordine è verificato sul contenuto, non sul nome soltanto.
4. Test contabili con dati sintetici: riparto esatto al centesimo, rate con importi coerenti, pagamenti parziali, storno auditato, riporto/compensazione e blocco esercizio chiuso.
5. Test di passaggio: rogito alla data effettiva, vecchio titolare con storico preservato, nuovo titolare con rate corrette, accesso portale revocato/attivato, nessun addebito duplicato.
6. Test catastali: fusione e frazionamento con genealogia/snapshot, tabelle millesimali da revisionare e divieto di mutare unità storiche senza conferma autorizzata.
7. La sequenza completa viene eseguita da zero su un ambiente isolato e confrontata con i cataloghi. Il collaudo statico da solo non autorizza il rilascio.

## Esclusioni esplicite

Questo manifesto non è SQL eseguibile, non modifica database e non autorizza deploy o migrazioni Production. I dati Production non devono essere copiati nel branch di sviluppo senza una procedura separata di minimizzazione e protezione.
