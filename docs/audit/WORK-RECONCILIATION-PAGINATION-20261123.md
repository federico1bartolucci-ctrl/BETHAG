# Audit — Paginate work financial reconciliation reads

Date: 2026-11-23

## Finding

\`reconcileCondominiumWork()\` used four unpaginated reads:
- work-document links for the selected work;
- workspace documents filtered by the linked legacy document IDs;
- SAL progress rows for the work;
- outgoing ledger entries for the condominium.

The default PostgREST response cap can truncate each result. In particular, an outgoing ledger entry beyond the first 1,000 rows may be omitted from the reconciliation totals, and linked documents or SAL rows beyond the cap may be missing from the displayed result.

## Correction

- Add a shared read-only loader with keyset pagination by primary-key \`id\`.
- Preserve workspace, condominium, work, direction and legacy-document-ID filters.
- Chunk document legacy IDs into bounded groups of 500.
- Fail closed on any later-page error or invalid cursor rather than returning a partial reconciliation.
- Restore SAL display order by \`progress_no\` after loading.

## Runtime regression

\`scripts/test-work-reconciliation-pagination.mjs\` is integrated into \`npm test\`. It reproduces the baseline 1,000-row cap, verifies that the loader retrieves 1,001 ledger entries and SAL rows, paginates 1,001 work-document links, retrieves 1,001 documents using bounded legacy-ID chunks, and confirms that later-page errors abort the result. Static wiring assertions cover all four production reads.

## Safety

Draft branch from \`main\`. Read-only data loading only. No QA or Production data changes, merge, deployment, reset, or manually dispatched workflow.
