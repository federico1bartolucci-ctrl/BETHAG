# BETHAG — revisione tecnica interna della proposta ACL globale

**Esito:** PASS CON CONFLITTO DICHIARATO — NON INDIPENDENTE  
**SHA sorgente esaminato:** `618c459b7ae9efb2e2247791d7d71e85027ae508`  
**PR:** [#434](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/434)  
**Revisore:** ChatGPT, stesso agente che ha contribuito all'implementazione. Non è una persona terza e questa revisione non è indipendente.

## Ambito esaminato

- Migrazione candidata `20261124234000_revoke_postgres_global_public_function_execute.sql` e blob SHA `499ea493e828243309ee2f4bb9c3242d2fbeb862`.
- Preflight e postflight del ledger Production 267→268.
- Runner Production dedicato, inclusi controlli target, TLS, SHA, fingerprint, approvazione, finestra UTC, lock transazionale e preservazione integrale delle 267 coppie storiche.
- Runner di rehearsal locale e test PostgreSQL 17.
- Regressione dei default ACL globali/schema-specifici e test del vincolo di revisione interna.

## Verifiche e risultati

1. **Migrazione:** limita la modifica ai default globali delle funzioni create da `postgres`; revoca EXECUTE a PUBLIC e ai ruoli applicativi. Non riscrive ACL di funzioni esistenti e non modifica i default dei ruoli gestiti da Supabase.
2. **Storage:** preflight, postflight e regressione verificano la conservazione dei grant schema-specifici intenzionali per `anon`, `authenticated` e `service_role`.
3. **Ledger:** il runner pretende le 267 coppie versione/nome esatte prima della transazione; inserisce una sola migrazione e verifica 268 righe senza alterare alcuna coppia storica.
4. **Fail-closed:** l'applicazione Production richiede target e TLS corretti, checkout pulito, SHA e fingerprint esatti, approvazione owner, finestra UTC, preflight e postflight. Il test negativo verifica il blocco prima della connessione quando manca l'approvazione.
5. **Revisione interna:** il guard richiede lo stesso SHA per QA e revisione; richiede `INTERNAL_SELF_REVIEW`, `PASS_WITH_DISCLOSED_CONFLICT`, `independent=false` e `conflict_disclosed=true`. I test rifiutano SHA discordanti, evidenze mancanti e qualsiasi falsa dichiarazione di indipendenza.

## Evidenza CI exact-SHA

Tutti i run seguenti si riferiscono allo SHA `618c459b7ae9efb2e2247791d7d71e85027ae508`:

- Build #4698, inclusa la suite `npm test`: [SUCCESS](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45516305844).
- PostgreSQL 17 bootstrap e rehearsal: [SUCCESS](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45516305844).
- Baseline Safety #1541: [SUCCESS](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45516305814).
- Collaudo autenticato APP-01…APP-15 #1378: [SUCCESS](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45516305768). Il piano Portal QA è stato ripristinato e il preview arrestato correttamente. Il probe di invio live Resend è rimasto escluso; nessuna email live inviata.

## Rilievi e limiti residui

- Nessun difetto bloccante rilevato nell'ambito esaminato.
- **Questa non è una revisione indipendente.** L'autore dell'implementazione e l'autore di questa verifica coincidono; il conflitto è dichiarato.
- La schermata Production del 24 novembre conferma il conteggio degli schemi esposti ma non ne mostra i nomi. L'evidenza Production con i nomi è dell'8 novembre e non soddisfa il requisito temporale di 24 ore del runner. Il gate resta aperto.
- Il restore fisico gestito dal provider non è stato testato. Il rischio residuo era stato accettato dal proprietario il 27 ottobre; non viene presentato come test superato.
- Manca una nuova approvazione esplicita del proprietario, vincolata allo SHA sorgente, fingerprint, hash candidato, progetto Production e finestra UTC.

## Conclusione

La proposta supera la revisione interna e i test exact-SHA, con la limitazione di non indipendenza dichiarata. Il manifest resta `DRAFT_NOT_APPROVED`; `approval_scope=NONE`; `production_apply_authorized=false`. Nessuna migrazione, DDL, scrittura ledger, merge o deploy Production è autorizzato o eseguito. Il runner non deve essere eseguito finché tutti i gate residui e l'approvazione separata del proprietario non risultino soddisfatti.
