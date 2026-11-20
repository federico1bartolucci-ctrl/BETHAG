# BETHAG — stato operativo e release alignment

**Aggiornamento:** 20 novembre 2026  
**Branch di riferimento:** `main`  
**Ambito:** audit QA/release; documento di stato, non autorizzazione al deploy o al cutover.

## Stato verificato

### Punto 6 — CI/workflow audit: CHIUSO
PR #77 è integrata in `main` (merge commit `29ae2870618069e59c21c0c1ae5c642be2f1ca1b`). La correzione assegna un nome distinto agli artifact GitHub Pages anche nei rerun, usando il run attempt.

Verifiche post-merge riportate:
- Deploy GitHub Pages: run [44762526860](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/44762526860) — SUCCESS.
- Sintassi workflow QA: run [44762526767](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/44762526767) — SUCCESS.
- Build: run [44762526716](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/44762526716) — SUCCESS.
- PostgreSQL bootstrap: SUCCESS.
- Baseline safety: SUCCESS (verifica precedente).

### Punto 7 — protezione workflow QA mutativi: NON INTEGRATO
PR #78: [Add explicit confirmation gates for manual QA workflows](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/78).

- Branch: `audit/qa-manual-mutation-gates-20261120`.
- Stato: OPEN, DRAFT, non integrata.
- Introduce conferma esplicita `yes` (default `no`) per i dispatch manuali dei workflow che possono mutare il QA condiviso.
- I controlli sul branch sono riportati PASS per bootstrap PostgreSQL, build e baseline safety; il final QA è intenzionalmente SKIPPED.
- Nessun workflow mutativo è stato dispatchato; QA e Production non sono stati modificati.

**Non descrivere queste protezioni come attive su `main` finché PR #78 non sarà integrata.**

### QA applicativo
I precedenti report registrano APP-01..APP-13 e APP-15 PASS. Questo è un risultato storico del collaudo; non equivale a una nuova certificazione completa del commit attuale. APP-14 rimane legato al post-cutover Production.

### Production / cutover
- Stato decisionale documentato: **NO-GO**.
- La precedente indicazione di “19 migrazioni incrementali da applicare” non è riconciliata con l'evidenza del ledger Production (267 migrazioni uniche, missing 0, extra 0, name divergences 0). Non va considerata un elenco di migrazioni pendenti né autorizzazione ad applicarle: occorre chiarire origine e ambito di quel conteggio prima di qualsiasi procedura.
- Nessuna migrazione Production, DDL/DML, ledger write o preflight operativo aggiornato è stato eseguito nell'ambito di questo allineamento documentale.
- Il restore fisico provider-managed resta **NON TESTATO**.
- Nessuna autorizzazione di merge, deploy o cutover deriva da questo documento.

## Sequenza residua

1. Integrare PR #78 solo dopo review e approvazione esplicita.
2. Aggiornare/validare la documentazione operativa dopo l'integrazione, distinguendo branch e `main`.
3. Eseguire i controlli finali sul commit candidato esatto, senza mutazioni QA condivise.
4. Completare il preflight Production read-only e raccogliere evidenze fresche secondo il runbook.
5. Riesaminare tutti i gate di cutover; mantenere NO-GO finché non sono soddisfatti.
6. Decisione finale GO/NO-GO separata e riferita a SHA, fingerprint e hash SQL esatti.

## Principio
I report datati restano evidenze storiche. Questo documento riassume lo stato corrente e non li sostituisce né retrodata nuove verifiche.
