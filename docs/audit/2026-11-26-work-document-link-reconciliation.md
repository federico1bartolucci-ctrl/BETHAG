# Audit — safe reconciliation of work-document links

**Date:** 26 November 2026

## Reproducible finding

The Register's saveWorkDocuments handler previously deleted every condominium_work_documents row for a work item and then inserted the selected replacement set. A successful delete followed by a failed insert left the work item with no document links, losing the previously saved associations. A failure during the delete could also leave the user uncertain about which links remained.

The existing PR #278 correctly surfaced a delete error, but it did not prevent the destructive full replacement from deleting the old set before a new set had been persisted.

## Correction

- Read the current document IDs again immediately before saving.
- Compute only the IDs to add and the IDs to remove, deduplicating both sets and rejecting invalid IDs.
- Insert missing links first; if insertion fails, do not delete any existing link.
- Delete only obsolete IDs, scoped by workspace, condominium and work.
- If deletion fails after insertion, retain the old and new links, surface the error, and keep the form available. A retry re-reads the database, avoids reinserting already-added links, and retries only the remaining deletion.
- Scope the initial link read by workspace, condominium and work as well.

This is a retry-safe, non-destructive reconciliation sequence. It does not claim a multi-statement database transaction; concurrent administrators can still require a refresh/retry if their desired sets differ.

## Regression coverage

The expanded scripts/test-work-document-delete-error.mjs verifies:
- the diff plan and duplicate-ID normalization;
- invalid current or desired IDs fail before writes;
- insert failure leaves the existing link set untouched;
- delete failure leaves old links intact and retry converges without duplicate insertion;
- successful execution inserts before deleting and removes only obsolete IDs;
- the UI uses the helper and applies workspace/condominium/work filters;
- the test remains wired into npm test.

No schema or migration registry change is needed.

## Safety

The correction extends existing Draft PR #278 on its isolated branch. No QA or Production data/configuration is modified. No merge, deploy, reset, or manual workflow dispatch is performed.
