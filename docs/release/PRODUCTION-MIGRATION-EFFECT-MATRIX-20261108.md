# BETHAG — matrice degli effetti delle 19 migrazioni candidate Production

Data di redazione: 2026-11-08  
Ambito: revisione documentale e confronto delle evidenze già disponibili.  
Riferimenti principali:
- `supabase/rebuild/production-migration-cutover-freeze-20261105.json` (sequenza, ordine, Git blob SHA, postcondizioni congelate);
- `supabase/rebuild/live-migration-ledgers-20261105.json` (snapshot ledger);
- addendum dell'8 novembre in `docs/release/CUTOVER-VERIFICATION-ADDENDUM-20261107.md`;
- payload SQL canonici presenti in `supabase/migrations/`.

## 1. Regole di lettura

Questa matrice descrive **la sequenza congelata di 19 migrazioni candidate**, non i 19 record QA-specifici. I due insiemi sono distinti: i ledger mostrano 36 record QA-only (5 baseline, 12 canonici e 19 QA-specifici/storici) e 1 record Production-only. Non si deve dedurre che i 19 elementi del manifest siano la trascrizione dei 36 record QA-only.

Il manifest conserva ordine e hash dei 19 payload. La matrice non li modifica e non dichiara che debbano essere applicati tutti. La decisione finale richiede per ogni effetto: confronto della definizione SQL effettiva in Production, verifica delle ACL/cataloghi, eventuale equivalente già applicato con timestamp diverso, dipendenze e test di regressione.

**Stato dei database:** nessuna scrittura, migrazione o replay remoto viene effettuato da questo documento. Non autorizza merge, deploy, apply o modifica di Production.

## 2. Evidenze Production/QA disponibili all'8 novembre

L'addendum dell'8 novembre riporta il seguente confronto read-only:
- 48 relazioni pubbliche in entrambi gli ambienti;
- 627 colonne in QA e 626 in Production; l'unica differenza di colonna identificata è `public.workspace_members.data`;
- nessuna differenza rilevata in indici, vincoli, policy RLS e privilegi effettivi sulle tabelle;
- 173 funzioni in QA e 171 in Production, con differenze di implementazione e ACL ancora da esaminare a livello di singola routine;
- un trigger aggiuntivo in QA e `pg_net` presente solo in QA;
- concessioni EXECUTE aggiuntive su funzioni private in QA e due funzioni trigger con EXECUTE PUBLIC in Production.

Il manifest congelato aggiunge le seguenti osservazioni del catalogo Production:
- `workspace_members.data` assente;
- `condominiums.archived_at` presente;
- il comportamento server-owned di `private.save_condominium` per i campi di archiviazione non ancora preservato;
- il wrapper pubblico di chiusura subentro non è SECURITY DEFINER; l'implementazione privata resta SECURITY DEFINER;
- accesso allo schema `private` e EXECUTE del percorso privato di chiusura risultano presenti per authenticated e service_role;
- MAINTAIN effettivo risulta zero per authenticated e service_role;
- due funzioni trigger pubbliche risultano tra i target con EXECUTE PUBLIC.

Le evidenze aggregate non sostituiscono la lettura delle singole definizioni di funzione e delle ACL effettive. Dove il dato puntuale non è disponibile, la matrice marca esplicitamente il punto come da verificare.

## 3. Matrice, nell'ordine congelato

| # | Migrazione e hash congelato | Effetto concreto | Evidenza Production disponibile | Valutazione preliminare |
|---:|---|---|---|---|
| 1 | `20261022210629_restrict_private_function_public_execute` — `1476e921de9a43e3c046ef448a91c28d3515fd8c` | Revoca EXECUTE implicito di PUBLIC su tutte le routine dello schema private. | L'inventario segnala differenze di EXECUTE sulle routine private tra QA e Production; manca in questa matrice l'elenco puntuale delle routine con PUBLIC ACL in Production. | **Da verificare per routine.** Non assumere che la revoca globale sia un no-op né applicarla senza verificare gli accessi legittimi richiesti dai wrapper. |
| 2 | `20261022210630_harden_default_privileges_and_private_execute` — `09751ed091c507d1db13ac48deba5f336e835a13` | Rimuove i default CRUD di anon sulle tabelle future create da postgres, rimuove i default PUBLIC EXECUTE per funzioni private e revoca PUBLIC EXECUTE sulle routine private esistenti. | Il confronto delle ACL effettive delle tabelle non copre da solo i default ACL. Il manifest segnala la necessità di controllare i default e preservare i default provider-managed di supabase_admin. | **Da verificare sui default ACL e sulle routine.** Sovrapposizione parziale con #6, #16 e #18: non duplicare l'effetto senza confronto dei cataloghi. |
| 3 | `20261022213544_restrict_close_member_transfer_execute` — `7cf291acd1c1734959c5fef6c6f0477bbe0e24bf` | Limita EXECUTE del wrapper pubblico di chiusura subentro ad authenticated e service_role, negandolo a PUBLIC e anon. | Il manifest descrive il wrapper pubblico come accessibile ad authenticated/service_role e non come SECURITY DEFINER; non riporta in questa sezione la matrice completa PUBLIC/anon del wrapper. | **Da verificare sulle ACL esatte.** La sola modalità INVOKER non dimostra che PUBLIC/anon siano esclusi. |
| 4 | `20261022233440_align_public_function_execute` — `6987025124872b7f98c53c689bb014262624cba6` | Revoca PUBLIC EXECUTE su funzioni public/private, concede esplicitamente i due helper di chiusura alle API role e preserva due eccezioni trigger PUBLIC; aggiorna i default EXECUTE. | L'inventario dell'8 novembre segnala due funzioni trigger con EXECUTE PUBLIC in Production. La successiva candidata #17 rimuove proprio tali eccezioni. | **Effetto parzialmente superato da una correzione più restrittiva (#17).** Verificare routine per routine; non ripristinare PUBLIC sulle funzioni trigger. |
| 5 | `20261023000001_revoke_authenticated_maintain` — `b5c1cab798c61eeb63794400f6087767596c7372` | Revoca TRUNCATE, REFERENCES e TRIGGER da anon/authenticated e MAINTAIN da anon/authenticated sulle tabelle public esistenti. | L'addendum dichiara nessuna differenza rilevata nei privilegi effettivi delle tabelle; il manifest riporta MAINTAIN authenticated pari a zero. | **Probabile effetto già presente nel catalogo osservato.** Confermare l'intera lista di relazioni e le ACL prima di classificarla come non necessaria. |
| 6 | `20261023000002_revoke_default_maintain` — `8e55313ed2c9f6009f53c8f0ca1eb9dfbd042f79` | Rimuove i default anon CRUD e i default MAINTAIN/privilegi strutturali non necessari per authenticated; rimuove MAINTAIN dai default service_role, sia globali sia public. | Le ACL effettive delle tabelle risultano allineate; non è disponibile qui una scomposizione completa di tutti i default ACL globali e schema-specifici. I default supabase_admin sono provider-managed e vanno preservati. | **Da verificare sui default ACL globali e public.** Non tentare ALTER DEFAULT PRIVILEGES per supabase_admin. |
| 7 | `20261023000003_revoke_service_role_maintain` — `ca2115dbbbb64fd3868b54d9651f65e299a62edb` | Revoca MAINTAIN da service_role sulle 47 relazioni elencate e dal default public per tabelle future. | Il manifest riporta MAINTAIN service_role pari a zero sulle relazioni live e postgres_default_maintain pari a zero. | **Effetto sulle relazioni apparentemente già soddisfatto.** Verificare che la lista SQL copra esattamente tutte le 47 relazioni e che il default sia effettivamente assente prima di escludere il payload. |
| 8 | `20261023000004_application_default_table_privileges` — `20ebaed750f028e6e10172c7a85e67356a2ef21d` | Imposta i default delle tabelle public create da postgres: CRUD per authenticated; CRUD più privilegi strutturali per service_role; nessun MAINTAIN. | Il confronto delle ACL effettive non dimostra i default per le tabelle future. | **Da verificare sui default ACL.** Valutare insieme a #2, #6 e #16 per evitare revoche/concessioni additive incoerenti. |
| 9 | `20261023000733_use_invoker_for_close_transfer_rpc` — `bcbde9f82db1c931b5d2503987fa1da2b2b13b0a` | Imposta SECURITY INVOKER sul wrapper pubblico e concede schema USAGE/EXECUTE sulla funzione privata a authenticated/service_role, negando PUBLIC/anon. | Il manifest attesta già wrapper pubblico non SECURITY DEFINER, implementazione privata SECURITY DEFINER e accesso schema/funzione per entrambe le API role. | **La modalità INVOKER e il percorso privato risultano già presenti.** Restano da verificare ACL PUBLIC/anon e definizione completa; possibile equivalente forward già registrato in Production. |
| 10 | `20261027100000_revoke_public_execute_from_transfer_closure_helpers` — `5b7a34ee56f4a1cb1b1a145760aff5880e84e5f7` | Revoca PUBLIC/anon EXECUTE sui due helper di chiusura e concede esplicitamente authenticated/service_role. | Il manifest elenca entrambi gli helper tra i target con EXECUTE PUBLIC nella fotografia Production. | **Gap ACL concreto da verificare e correggere.** La concessione alle API role va mantenuta; non confondere EXECUTE diretto con invocazione tramite trigger. |
| 11 | `20261027110000_repair_service_role_transfer_invoker_path` — `0b50853114442b946abb2cac8ab37fe6db64e074` | Ripristina USAGE su private ed EXECUTE sulla funzione privata di chiusura per service_role, senza concedere accesso a PUBLIC/anon. | Il manifest riporta già schema USAGE e private EXECUTE per service_role come presenti. | **Effetto apparentemente già soddisfatto.** Verificare il privilegio effettivo e la firma della funzione; non applicare per il solo fatto che il file esiste nel manifest. |
| 12 | `20261028100000_fix_collaborator_module_permission_boolean` — `f2f7e559daa5145ef036e68d5366290798a44b9d` | Corregge le funzioni di autorizzazione affinché un permesso JSON booleano false neghi lettura e scrittura; mantiene il formato legacy ad array. | Il confronto segnala differenze tra definizioni di funzione QA e Production, ma non identifica nel riepilogo la definizione di queste due routine. | **Da confrontare sul corpo SQL esatto e testare.** Non assumere che sia già presente in Production sulla base dei test QA. |
| 13 | `20261102100100_add_workspace_member_profile_data` — `ec905c74412dae599a443b5ebbe492f9d5826afc` | Aggiunge `workspace_members.data jsonb NOT NULL DEFAULT '{}'`. | Differenza di schema confermata: 627 colonne QA contro 626 Production; la sola colonna mancante identificata è `workspace_members.data`. | **Gap Production confermato.** Migrazione additiva candidata; verificare dipendenze applicative, default, RLS e compatibilità prima di un futuro cutover. |
| 14 | `20261102100200_preserve_server_owned_condominium_archive_state` — `130de21194958cb80b7b87e4aafdf7cc60435c7c` | Aggiorna `private.save_condominium` affinché gli aggiornamenti ordinari non sovrascrivano `archived_at`, `archived_by` e `archive_reason`; conserva i controlli di autorizzazione. | `archived_at` esiste in Production, ma il manifest segnala che il comportamento di preservazione in `private.save_condominium` non è presente. | **Gap funzionale confermato dal manifest.** Verificare anche `archived_by`, `archive_reason`, firma, search_path e test archive/restore. |
| 15 | `20261104130000_reconcile_qa_security_and_coowner_rpcs` — `a445bc47d71e1d5e27e654e0802d292a8b653d8f` | Aggiorna le implementazioni private archive/restore; aggiunge trigger per metadati comproprietari in ingresso; allinea 18 grant EXECUTE a wrapper invoker; restringe helper e ACL della vista fund availability; rimuove anon CRUD default. | L'inventario segnala un trigger aggiuntivo in QA, funzioni/ACL differenti e metadati di comproprietari presenti nel percorso QA. L'addendum dichiara che i metadati comproprietari restano QA-specifici finché non ne sia dimostrata la necessità Production. | **Pacchetto composito, non approvabile come unità senza scomposizione.** Separare archive RPC, grant invoker, trigger comproprietari, helper ACL e vista; valutare il trigger co-owner come requisito funzionale distinto. Nessun dato di test va trasferito. |
| 16 | `20261105010000_reconcile_postgres_public_table_default_acl` — `104966fe4315c04238b424beab4fb6a52d2b24ed` | Normalizza i default ACL public delle tabelle create da postgres: authenticated CRUD, service_role CRUD+strutturali, anon zero, MAINTAIN zero; contiene precheck e verify. | La matrice disponibile non espone ancora il dettaglio completo dei default ACL effettivi per ciascun ruolo. | **Da verificare con catalog query puntuale.** È una candidata di consolidamento che può assorbire/sovrapporsi a #2, #6 e #8; non eseguire insieme a queste senza dimostrare l'ordine e l'effetto netto. |
| 17 | `20261105020000_revoke_public_execute_from_public_trigger_functions` — `2ed0e4aa1f7f8b97c52d054f2a0dacdf54e2e53f` | Revoca EXECUTE diretto a PUBLIC/anon/authenticated sulle due funzioni trigger, preservando owner e service_role; verifica tipo trigger, SECURITY INVOKER e privilegi. | Due funzioni trigger in Production risultano ancora con EXECUTE PUBLIC; la migrazione è mirata esattamente a tale anomalia. | **Gap Production confermato.** Candidata necessaria salvo prova che una correzione successiva equivalente sia già stata applicata; il privilegio di invocazione trigger non richiede EXECUTE diretto al chiamante. |
| 18 | `20261105030000_reconcile_postgres_public_function_sequence_default_acl` — `4702930eb40f85405053a0db10be70bc9987e3f9` | Rimuove i default EXECUTE/privilegi sequence per PUBLIC, anon, authenticated e service_role su funzioni e sequenze public create da postgres; non tocca oggetti esistenti o default supabase_admin. | L'inventario riassuntivo non riporta il dettaglio dei default ACL di funzioni e sequenze. | **Da verificare sui cataloghi pg_default_acl globali e public.** Il precheck del payload può arrestarsi se esistono default globali inattesi: non aggirare il gate. |
| 19 | `20261105050000_reconcile_portal_registration_upsert` — `43029cf687106b22a1067c7205695ddf6677d145` | Centralizza l'upsert portal_access; lega la registrazione al condominio scelto; blocca mismatch, duplicati e ambiguità; serializza il collegamento con row lock; preserva i ruoli staff e nega EXECUTE diretto sull'helper interno. | L'addendum segnala differenze tra funzioni QA e Production. Il record QA-specifico `20261104235514_fix_portal_registration_upsert_conflict_target` è una possibile sorgente funzionale, ma non è prova che il payload completo sia già presente in Production. | **Da confrontare definizione per definizione e testare.** Verificare self-registration, approvazione admin, nomi duplicati nello stesso workspace, email verificata, account già collegati e assenza di side effect in caso di rifiuto. |

## 4. Migrazioni Production già registrate, da non confondere con le 19 candidate

Il manifest registra già nel ledger Production tre migrazioni forward successive al freeze precedente:
- `20261102151610_harden_live_production_acl_and_transfer_invoker`;
- `20261102200855_restore_secure_communication_recipient_rpc_execute`;
- `20261103070901_grant_service_role_private_resend_event_rpc`.

Sono parte della storia effettiva Production. Vanno preservate e riprodotte soltanto nel rehearsal isolato quando previsto dal runbook per ricostruire lo stato corrente; non vanno riapplicate in Production né contate come nuove candidate tra le 19.

La migrazione Production-only `20261104222229_reconcile_production_acl_least_privilege` è anch'essa già registrata e va preservata. Non va riapplicata.

## 5. Dipendenze e sovrapposizioni da risolvere prima di una lista eseguibile

1. **ACL funzioni:** #1, #3, #4, #9, #10, #11, #15 e #17 si sovrappongono su EXECUTE, wrapper e helper. Serve una matrice per singola routine che specifichi owner, SECURITY DEFINER/INVOKER, PUBLIC, anon, authenticated e service_role.
2. **Default ACL tabelle:** #2, #6, #8 e #16 agiscono su ambiti globali/schema-specifici e sono additive. Occorre calcolare lo stato finale atteso per ciascun ruolo e tipo oggetto, preservando i default provider-managed.
3. **Trasferimento/subentro:** #3, #9, #10 e #11 devono essere valutate come percorso completo: wrapper pubblico INVOKER, implementazione privata autorizzata, grant espliciti e test no-JWT/anon/rollback.
4. **Archivio e comproprietari:** #14 e la parte archive di #15 hanno responsabilità sovrapposte. La parte trigger co-owner di #15 è un requisito distinto e non deve essere introdotta soltanto per pareggiare QA.
5. **Portale:** #19 va confrontata con il payload QA-specifico di origine e con le definizioni Production; nessuna equivalenza può essere dedotta dal nome o dal solo test QA.
6. **Funzioni e sequenze future:** #18 richiede inventario dei default globali e public prima di qualsiasi apply; un precheck fallito è uno STOP, non un invito a indebolire il controllo.

## 6. Esito della matrice e prossime verifiche

La matrice ha identificato:
- **gap strutturali/funzionali confermati dalle evidenze disponibili:** colonna `workspace_members.data` (#13); preservazione server-owned dei campi archive in `private.save_condominium` (#14);
- **gap ACL Production direttamente segnalati:** EXECUTE PUBLIC sulle due funzioni trigger (#17) e sugli helper di chiusura indicati nel manifest (#10, da confermare sulle ACL puntuali);
- **effetti apparentemente già presenti, da convalidare prima di escludere una migrazione:** MAINTAIN effettivo zero (#5, #7), wrapper close già INVOKER e percorso privato disponibile (#9, #11);
- **punti ancora non determinati a livello di oggetto:** default ACL (#2, #6, #8, #16, #18), routine private/public (#1, #3, #4, #12), pacchetto composito archive/co-owner (#15) e implementazione portal (#19).

Quindi **non è corretto dichiarare chiusa la riconciliazione** sulla base di questa sola matrice. Per chiuderla servono le verifiche read-only puntuali indicate sopra, seguite da rehearsal PostgreSQL 17 isolato e verifica delle postcondizioni. La sequenza frozen resta immutata durante la revisione; la futura lista di migrazioni necessarie dovrà essere approvata separatamente.

## 7. Gate di sicurezza

- Nessuna modifica a Production, ai ledger remoti o alle migrazioni SQL.
- Nessun merge o deploy autorizzato da questo documento.
- Nessun replay su QA remoto o Production; il rehearsal ammesso è esclusivamente isolato e usa PostgreSQL 17 in CI.
- Nessuna baseline QA e nessun payload QA-specifico devono essere copiati automaticamente in Production.
- I default provider-managed di `supabase_admin` restano fuori dal perimetro delle correzioni.
- Production resta **NO-GO** fino a una matrice oggetto-per-oggetto completa, rehearsal, preflight read-only, nuova finestra e approvazione scritta sullo SHA eseguibile esatto.
