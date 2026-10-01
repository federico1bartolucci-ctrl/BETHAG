# BETHAG — Verifica di sovrapposizione schema/migrazioni

**Data:** 1 ottobre 2026  
**Ramo analizzato:** `backup/pre-rollback-20261001`  
**Esito:** verifica statica parziale dei file sorgente. Nessuna migrazione eseguita e nessun dato modificato.

## Riscontri confermati

1. Il repository contiene 129 file SQL in `supabase/migrations`, ma manca il bootstrap iniziale indicato nel registro Production (`20260928021707_initial_bethag_backend`). Non è quindi possibile ricostruire uno schema vuoto applicando semplicemente i file presenti in ordine.
2. La proposta `PROPOSED-FOUNDATION-DDL-NOT-APPLIED.md` include tabelle che sono già create da migrazioni successive con `CREATE TABLE IF NOT EXISTS`. È verificato almeno per:
   - `condominium_allocation_rules`: presente in `20260930110000_accounting_consumption_and_installment_percentages.sql` e nuovamente in `20260930241000_allocation_rules_and_consumption.sql`;
   - `condominium_consumption_readings`: presente in entrambe le migrazioni precedenti;
   - `condominium_member_transfers`: presente nella proposta fondativa e in `20261001104500_add_condominium_member_transfer.sql`.
3. Le due migrazioni `20260930110000_accounting_consumption_and_installment_percentages.sql` e `20260930110000_allocation_criteria_scope.sql` condividono lo stesso timestamp. Lo stesso problema è già presente anche con timestamp `20260930200000` e `20260930210000`. Prima di qualsiasi esecuzione sequenziale, ogni versione deve essere univoca e l'ordine logico va preservato.
4. Le migrazioni contabili successive fanno riferimento a tabelle fondative come esercizi fiscali, movimenti contabili, riparti, rate e tabelle millesimali. La loro esistenza non può essere garantita dal solo ledger delle migrazioni.
5. La proposta DDL dichiara esplicitamente di non includere policy RLS, grants, trigger, funzioni, proprietari, commenti e sequence/identity. La proposta delle 62 policy RLS è un artefatto separato e non risolve da sola dipendenze, privilegi, funzioni helper e trigger.

## Implicazioni operative

- Non eseguire la proposta fondativa insieme alle migrazioni attuali: `IF NOT EXISTS` può evitare l'errore di creazione, ma non riconcilia colonne, constraint o semantiche divergenti di una tabella già presente.
- Non rinumerare i timestamp in modo puramente alfabetico: le migrazioni di hardening devono seguire la creazione delle tabelle, delle funzioni e dei trigger a cui si riferiscono.
- Prima di preparare un bootstrap applicabile, confrontare per ogni tabella definizione completa (colonne, default, vincoli, indici, RLS, grants), routine e trigger con il catalogo Production; poi eliminare o riscrivere le migrazioni che ripetono la stessa fondazione.
- La verifica finale richiede un ambiente isolato riproducibile e test SQL/integrazione, inclusi i test di autorizzazione per amministratore, collaboratore e condomino. Un controllo statico dei file non equivale a un collaudo runtime.

## Prossimo passo tecnico

Produrre un bootstrap consolidato e ordinato per dipendenze, separando fondazioni, funzioni/helper, trigger, grants e policy. Eseguirlo esclusivamente in un ambiente di sviluppo isolato dopo averne verificato la corrispondenza con il progetto di destinazione. La produzione resta invariata fino ad autorizzazione esplicita e piano di migrazione con backup e rollback.
