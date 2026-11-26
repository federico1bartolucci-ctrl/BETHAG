# Work financial reconciliation pagination — 2026-11-26

## Finding

reconcileCondominiumWork performed four unpaginated reads: work-document links, linked documents, SAL progress rows and outgoing ledger entries. The default PostgREST row cap could truncate invoices, SALs, linked documents or ledger rows, producing incomplete reconciliation totals and displays.

## Correction

- Add deterministic keyset pagination by primary-key ID for all four reads.
- Preserve workspace, work, condominium and direction filters.
- Chunk linked document legacy IDs into bounded batches of 500.
- Fail closed on later-page errors, malformed non-array responses, missing IDs or non-advancing cursors.
- Restore SAL display order by progress number after complete loading.

## Regression coverage

- Reproduce the 1,000-row response cap and recover 1,001 ledger, SAL and link rows.
- Recover 1,001 linked documents using bounded legacy-ID batches.
- Preserve workspace/condominium/work/direction filters and keyset cursor progression.
- Abort on a later-page error and on a successful null response.
- Verify all four production reads use the paginated loader and npm test runs the regression.

## Safety

Read-only application data loading, helper, tests and documentation only. No migrations, QA/Production database access or writes, resets, Supabase deployments or paid service activation.
