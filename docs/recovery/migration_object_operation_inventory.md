# Inventario delle operazioni e dipendenze delle migrazioni — revisione preliminare

**Branch:** `bethag-migration-repair`  
**Ambito:** analisi statica del repository, senza esecuzione SQL.  
**Stato:** baseline non certificata; documento di lavoro, non migrazione.

## Scopo

Rendere esplicite le dipendenze che emergono dall'ordine dei file disponibili, evitando di correggere singole migrazioni isolatamente e riprodurre cicli di ricostruzione. Il tree GitHub del branch restituisce 132 file `supabase/migrations/*.sql`. La presente revisione approfondisce un gruppo rappresentativo di migrazioni iniziali e quelle relative alle unità, millesimi e trasformazioni; non costituisce ancora una classificazione semantica riga per riga di tutti i 132 file.

## Evidenze statiche

| File | Operazione rilevata | Dipendenze/implicazioni |
|---|---|---|
| `20260928050000_reconstruct_portal_access_registry.sql` | Crea `public.portal_access`, abilita RLS e crea policy | Le FK richiedono già `workspaces`, `condominiums`, `condominium_members` e `profiles`. È un frammento di ricostruzione, non lo schema iniziale completo. |
| `20260928060000_expose_first_admin_bootstrap.sql` | Definisce `claim_first_workspace_admin` | Presuppone strutture di workspace/profilo e autorizzazione già disponibili. |
| `20260928070000_save_condominium_rpc.sql` | Definisce RPC di salvataggio/cancellazione condominio | Presuppone schema condominiale e funzioni/helper richiamati dal corpo. |
| `20260928090000_collaborator_module_write_permissions.sql` | Definisce helper privato e policy su più tabelle | Interroga oggetti core già esistenti; la sola presenza di questo file non crea le tabelle a cui applica policy. |
| `20260928153242_add_condomino_registration_workflow.sql` | Crea richieste registrazione, helper, RPC e policy | Dipende da workspace, profili e membri già creati. Le successive revisioni dell'upsert vanno confrontate semanticamente con questa prima versione. |
| `20260929165000_complete_condominium_units.sql` | Popola/normalizza unità e completa i dati derivati | Presuppone `condominium_units` e campi collegati già presenti; il file non contiene un `CREATE TABLE` rilevato nella revisione. |
| `20260929230350_harden_millesimal_allocation_integrity.sql` | Aggiunge vincoli a ripartizioni e rate | Presuppone tabelle contabili e dati compatibili con i nuovi vincoli; richiede preflight su dati preesistenti. |
| `20260930180000_ensure_millesimal_rows_for_units.sql` | Definisce funzioni per garantire valori millesimali per unità | Dipende da unità e schema millesimale già disponibili. |
| `20261001095000_add_unit_cadastral_transformations.sql` | Crea trasformazioni e righe di dettaglio con FK a `condominium_units`; modifica la tabella unità | Richiede necessariamente la tabella unità prima della creazione dei dettagli. |
| `20261001180000_restore_condominium_units_base.sql` | Crea la tabella base unità, collega i membri e configura RLS | Compare dopo migrazioni già riferite alle unità. È un indicatore di possibile inversione/assenza di prerequisiti nel set disponibile, da confermare con replay isolato e inventario completo. |

## Conseguenze per il recupero

1. **Il set non è un baseline autonomo dimostrato.** La prima migrazione disponibile crea il registro di accesso al portale e presume l'esistenza di oggetti fondamentali. Le successive RPC e policy confermano che parte dello schema è trattata come preesistente.
2. **L'ordine cronologico dei nomi non basta.** Occorre estrarre per ogni file gli oggetti creati, alterati, invocati e referenziati, distinguendo prerequisiti reali, sostituzioni di funzioni, modifiche dati e vincoli.
3. **Le unità hanno un blocco d'ordine concreto da risolvere.** Migrazioni di completamento, millesimi, integrità e trasformazioni fanno riferimento a `condominium_units`, mentre il file di creazione base identificato nel branch è datato successivamente. Non si conclude che il database di produzione sia privo della tabella: il catalogo di produzione la contiene. La criticità riguarda la riproducibilità pulita della sequenza disponibile.
4. **Le modifiche dati richiedono preflight.** Popolamento unità, normalizzazione codici, migrazioni millesimali e vincoli contabili vanno valutati su casi vuoti, parziali, duplicati, multi-palazzina e pertinenze autonome.
5. **Autorizzazione e struttura vanno certificate insieme.** Le policy residenti dipendono dai legami tra profilo, membro, unità, portale e workspace; un test solo di catalogo non dimostra isolamento tra condomìni o ruoli.

## Prossimo gate tecnico

- Completare la mappa semantica di tutti i 132 file, identificando per ciascuno gli oggetti SQL e le dipendenze.
- Confrontare ogni oggetto con gli snapshot di produzione già archiviati, annotando differenze e provenienza incerta.
- Ricostruire un baseline coerente solo dopo aver risolto le migrazioni mancanti e le dipendenze, senza fabbricare il contenuto delle migrazioni originali non reperite.
- Preparare un ambiente QA usa-e-getta separato dalla produzione e ottenere un primo replay registrando il primo errore SQL, senza correzioni speculative.
- Solo dopo replay riuscito, eseguire test runtime con identità sintetiche per amministratore, collaboratore, condomino proprietario, inquilino e utenti non associati; includere trasferimenti, continuità contabile, trasformazioni, archivio e cancellazione.

## Limiti e sicurezza

Questa revisione è statica e selettiva. Non è stato eseguito SQL, replay, collaudo runtime o confronto esaustivo di tutti i corpi di migrazione. Nessuna modifica è stata eseguita su Supabase produzione; nessun reset, migrazione, modifica della history, merge su `main` o deploy è stato effettuato. Il branch resta un'area di recupero documentale e non è autorizzato come baseline di produzione.
