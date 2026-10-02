# BETHAG — Delta di riconciliazione cronologia Supabase e sorgenti
**Data:** 2026-10-03  
**Ambito:** confronto in sola lettura tra cronologia migrazioni del progetto Supabase di produzione e file presenti nel branch GitHub `bethag-migration-repair`.

## Evidenze aggiornate
- La cronologia restituita da Supabase contiene **166 versioni**.
- La directory `supabase/migrations/` nel branch di riparazione contiene **134 file SQL**.
- Solo **10** file hanno un prefisso di versione identico a una versione della cronologia.
- Un confronto per nome, normalizzando maiuscole/separatori e rimuovendo l'eventuale timestamp ripetuto nel campo `name` di Supabase, trova **71 corrispondenze nominali**. Questa è una corrispondenza di etichetta, non una prova che il contenuto SQL sia quello effettivamente applicato.
- Restano quindi **95 versioni di produzione senza una corrispondenza nominale** nel set sorgente corrente. Le 134 sorgenti non abbinate non vanno considerate automaticamente migrazioni mancanti: alcune possono essere versioni rinominate, revisioni alternative, ricostruzioni o file mai applicati.
- La cronologia include nomi in cui il campo `name` incorpora un ulteriore timestamp, e presenta più versioni per alcuni nomi funzionali (ad esempio hardening dei trigger millesimali). Il solo nome non risolve ordine, contenuto o equivalenza.
- Il documento di baseline del 2026-10-01 riportava 153 versioni e 132 file. I conteggi qui sopra sono la fotografia più recente delle fonti interrogate e sostituiscono quei conteggi solo per questo delta; non spiegano da soli quando o come la cronologia sia cambiata.

## Metodo e limiti
Il confronto è stato effettuato fra le versioni e i nomi restituiti da `list_migrations` sul progetto di produzione e i nomi dei file SQL nel tree Git del branch indicato. Non è stato assunto che timestamp diversi indichino equivalenza, né che nomi simili provino identità semantica. Non è stata ricostruita una corrispondenza basata su hash del contenuto perché la cronologia Supabase non espone il testo SQL applicato.

## Conseguenza operativa
La baseline **non è ancora riconciliata**. Non rinominare in massa i file, non aggiungere versioni fittizie alla cronologia e non eseguire replay su produzione o su un ambiente non certificato. Per ogni versione occorre una voce di matrice con una delle classificazioni:
1. **Fonte esatta recuperata** — SQL originale e versione corrispondente.
2. **Equivalenza dimostrata** — contenuto sorgente confrontato con un artefatto autorevole dell'SQL applicato e differenze documentate.
3. **Sostituzione progettata** — nuovo baseline isolato, con assunzioni e differenze esplicite, non presentato come storico originale.
4. **Fonte non recuperata / equivalenza non dimostrata** — resta un blocco aperto.

## Prossima attività
Continuare la matrice con le fonti disponibili: cercare gli artefatti storici (backup Git, PR, workflow/deploy artifact ed eventuali export autorizzati), poi associare gli oggetti di catalogo osservati alle migrazioni solo quando esiste evidenza sufficiente. La ricostruzione non deve alterare la produzione.

## Salvaguardie
Questa attività ha letto la cronologia Supabase e l'albero GitHub. Non ha eseguito SQL, modificato schema o dati, cambiato la cronologia Supabase, fatto merge, né effettuato deploy. Il collaudo QA complessivo resta sospeso fino alla risoluzione dei blocker già registrati.

## Verifica aggiuntiva dei branch storici
Sono stati letti anche gli alberi delle migrazioni dei branch `main` e `backup/pre-rollback-20261001`: entrambi espongono 129 file nella directory `supabase/migrations/`. In entrambi la sequenza visibile parte da `20260928060000_expose_first_admin_bootstrap.sql`; non è emerso un file sorgente con il nome/versione dell'iniziale `20260928021707_initial_bethag_backend` né una migrazione che corrisponda in modo identificabile a `20260928043547_restrict_data_api_table_grants`. Questo rafforza il rilievo di fonte non recuperata nei branch Git esaminati, ma non esclude backup o artefatti esterni non consultati.
