# Audit — Paginate work deletion accounting/invoice guards

Date: 2026-11-23

## Finding

`deleteCondominiumWork()` used unpaginated reads for work-progress rows and linked work-document rows. It then fetched the documents for those legacy IDs in a single `IN` query. PostgREST's default row cap (commonly 1,000) could truncate these guard inputs.

If an accounting-linked SAL or a confirmed invoice appeared beyond the cap, the delete guard could fail to see it and authorize deleting the work, breaking accounting traceability.

## Correction

- Add `loadCondominiumWorkDeletionRows()`, a read-only keyset pagination loader.
- Paginate progress rows, work-document links, and linked documents.
- Chunk legacy document IDs into bounded batches of 500.
- Fail closed if a later page errors, lacks IDs, or does not advance the cursor.
- Keep workspace and work filters on all reads.

## Regression

`scripts/test-work-deletion-guard-pagination.mjs` is added to `npm test`. It reproduces the 1,000-row capped baseline with 1,001 links/documents and places the invoice at the last row; the baseline misses it. The fixed loader retrieves all 1,001 rows and finds the invoice. It also checks scoping, batch bounds, later-page failure handling, and production wiring.

## Safety

Draft branch based on `main`. This is read-only loading and guard logic only. No QA or Production data changes, merge, deployment, reset, or manual workflow dispatch.
