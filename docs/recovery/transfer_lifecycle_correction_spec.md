# BETHAG — proposta di correzione del ciclo di trasferimento

**Stato:** specifica tecnica non eseguibile; da verificare in ambiente QA isolato.  
**Branch:** `bethag-migration-repair`  
**Produzione:** nessuna modifica eseguita.

## Obiettivo

Rendere coerenti la chiusura del trasferimento, la continuità della posizione contabile del cedente e la revoca dei suoi accessi al portale, senza cancellare lo storico né attribuire automaticamente al cessionario debiti la cui imputazione richiede una valutazione giuridico-contabile.

## Correzioni richieste

### 1. Vincoli dello stato

La tabella `public.condominium_member_transfers` presenta due CHECK concorrenti sul campo `status`. La specifica della correzione dovrà mantenere un solo vincolo autorevole con gli stati previsti dal workflow: `Bozza`, `Confermato`, `Chiuso`, `Annullato`. Prima di applicare la correzione in QA, verificare i valori storici e l'eventuale dipendenza del frontend/API da ulteriori stati.

### 2. Separazione tra stato contabile e accesso

La conferma del trasferimento non deve usare il solo flag `active` come indicatore sia della continuità contabile sia dell'autorizzazione al portale. La posizione del cedente deve poter rimanere consultabile dall'amministratore per lo storico e la riconciliazione, mentre l'accesso residente del cedente deve essere disattivato esplicitamente e in modo atomico con la conferma del trasferimento.

La logica deve:
- disattivare il record `portal_access` collegato al cedente;
- disattivare l'eventuale appartenenza `workspace_members` con ruolo residente riferita al cedente e al condominio interessato;
- preservare il record membro, le rate, le allocazioni, i pagamenti e i riferimenti contabili storici;
- non disattivare accessi amministrativi o collaboratori che condividano lo stesso utente;
- predisporre l'accesso del nuovo proprietario soltanto dopo aver validato identità, associazione al condominio/unità e policy RLS;
- impedire che trigger di sincronizzazione riattivino involontariamente l'accesso del cedente in seguito ad aggiornamenti anagrafici.

Le operazioni devono essere transazionali e limitate alle righe del membro, workspace e condominio interessati. La revoca non deve basarsi soltanto su una variazione di `active` se il workflow mantiene il membro attivo per ragioni contabili.

### 3. Chiusura contabile

La chiusura deve essere impedita finché esistono residui non riconciliati nelle rate, allocazioni o riporti fiscali considerati dal modello. Le verifiche devono essere coerenti tra preview, snapshot e funzione di chiusura, includendo pagamenti parziali, importi di arrotondamento e righe senza scadenza.

La procedura non deve trasferire automaticamente al nuovo proprietario i residui del cedente. Occorre conservare la distinzione tra:
- data di trasferimento/rogito;
- data di deliberazione della spesa;
- scadenza della rata;
- soggetto a cui la posta è contabilmente associata;
- eventuale accordo tra le parti e valutazione di responsabilità verso il condominio.

Le poste non risolte devono rimanere esplicitamente segnalate e richiedere una decisione documentata dell'amministratore. Un riepilogo informativo o snapshot non equivale da solo a una scrittura contabile né determina la responsabilità giuridica.

### 4. Integrità e autorizzazioni

Verificare che tutte le funzioni chiamate dal flusso:
- validino l'identità autenticata e il permesso di gestione del modulo nel workspace;
- applichino controlli di appartenenza a condominio e unità;
- non consentano a un residente di leggere lo snapshot di un trasferimento non autorizzato;
- non permettano aggiornamenti incrociati tra workspace;
- siano coerenti con RLS, trigger e grants effettivi.

## Matrice QA obbligatoria

| Caso | Risultato atteso |
|---|---|
| Conferma trasferimento con cedente attivo sul portale | Conferma atomica; accesso residente cedente revocato; storico conservato |
| Nuovo proprietario associato all'unità | Accesso consentito solo dopo onboarding/validazione e secondo RLS |
| Cedente con ruolo aggiuntivo non residente | Revoca limitata al contesto residente del condominio; nessuna revoca di ruoli estranei |
| Chiusura con rata parzialmente pagata | Chiusura bloccata finché residuo non riconciliato |
| Chiusura con allocazione o riporto aperto | Chiusura bloccata con dettaglio della posta |
| Chiusura senza residui | Stato `Chiuso` consentito e timestamp/utente registrati |
| Due richieste simultanee di conferma/chiusura | Nessun doppio trasferimento o doppia chiusura |
| Aggiornamento anagrafico del cedente dopo il subentro | Il trigger non riattiva accessi revocati |
| Residente che interroga snapshot altrui | Accesso negato |
| Utente di un altro workspace | Nessuna lettura o modifica di dati del condominio |
| Spesa deliberata prima del rogito ma rateizzata dopo | Flag di revisione e trattamento non automatico |
| Pagamento successivo riferito a debito storico | Pagamento riconciliato sulla posizione storica senza riattivare il portale |
| Annullamento di un trasferimento confermato | Transizione controllata e reversibile solo con regole esplicite; nessun ripristino implicito degli accessi |
| Replay della stessa richiesta | Idempotenza o errore controllato, senza duplicati |

Per ogni test salvare identità sintetiche, dati iniziali, chiamata eseguita, esito atteso/effettivo e verifica post-operazione di tabelle, RLS e accessi. Testare anche token/sessioni già emessi: la disattivazione dei record applicativi non prova da sola l'invalidazione immediata di una sessione già autenticata.

## Criteri di accettazione

- Un solo vincolo di stato coerente e validato.
- Cedente non autorizzato al portale dopo conferma, anche in presenza di sessioni preesistenti secondo la politica di sessione definita.
- Nuovo proprietario isolato nel corretto workspace/condominio.
- Nessuna perdita o riassegnazione automatica dello storico contabile.
- Preview, snapshot e chiusura producono risultati coerenti.
- Test RLS e regressione superati su ambiente QA isolato.
- Diff e migrazione correttiva revisionati, backup e piano di rollback disponibili prima di qualsiasi eventuale intervento produttivo.

## Limiti attuali

Questa è una specifica di correzione, non una migrazione da eseguire. La baseline QA non è ancora stata ricostruita e riconciliata in modo completo; non sono stati eseguiti test runtime di questo workflow. Nessuna modifica al database di produzione è autorizzata o effettuata.
