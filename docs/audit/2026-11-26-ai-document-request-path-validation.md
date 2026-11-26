# Audit — AI document request path validation

**Date:** 26 November 2026

## Finding

The request-limit candidate bounded each AI analysis to 20 files and 100 MiB, but its request validator checked only that the array was non-empty and within the count limit. It accepted repeated `storagePath` values and malformed entries.

A request containing the same stored document multiple times therefore passed preflight and caused repeated Storage downloads and OpenAI uploads. The generated draft could also contain duplicate source material. A null or malformed entry passed preflight and failed later during prompt construction or file processing, producing an internal error instead of a client validation response.

## Correction

- Reject non-object file entries.
- Require every entry to contain a non-empty string `storagePath`.
- Reject duplicate `storagePath` values before prompt construction, Storage downloads, or OpenAI uploads.
- Preserve the existing 20-file, 50 MiB per-file and 100 MiB aggregate limits.
- Apply the same shared validator to both AI document-analysis Edge Functions.

## Regression

`scripts/test-ai-document-request-limits.mjs` reproduces the old count-only acceptance of duplicate paths and verifies the new validator rejects duplicates, null entries, non-object entries and missing/blank paths. Wiring assertions verify validation returns before filename mapping, Storage downloads and OpenAI uploads in both Edge Functions.

The test is included in `npm test`.

## Safety

Draft-only change based on current `main`. No AI provider calls, Storage reads/writes, QA or Production access, merge, deployment, reset or manual workflow dispatch.


## Regressione aggiuntiva — preflight dell'intero batch per workspace

Il controllo del prefisso Storage era eseguito nel ciclo, un documento alla volta. Un batch con un primo file valido e un secondo file appartenente a un altro workspace poteva quindi scaricare e caricare temporaneamente il primo file su OpenAI prima di respingere il secondo. Il blocco `finally` eliminava i file OpenAI già caricati, ma il trasferimento esterno era comunque avvenuto per una richiesta non valida.

La validazione condivisa ora riceve anche il workspace selezionato e verifica **tutti** i percorsi prima di qualsiasi download Storage o upload OpenAI. I controlli nel ciclo restano come difesa aggiuntiva. La regressione riproduce l'ordine del vecchio flusso e verifica che un batch misto venga respinto in preflight con HTTP 400, senza avviare elaborazioni parziali. Il test resta incluso in `npm test`.
