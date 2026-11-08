# Live migration ledger reconciliation — 2026-11-05

## Source of truth and safety
This report was captured read-only from the live Supabase migration registries on 2026-11-05. The machine-readable, complete version/name pairs are in [`supabase/rebuild/live-migration-ledgers-20261105.json`](../../supabase/rebuild/live-migration-ledgers-20261105.json).

- Production project `tctcgptrsmvgajqjgnev`: **248** rows; latest `20261104222229_reconcile_production_acl_least_privilege`.
- Existing QA branch `bethag-launch-qa`, project `jhuyhlzzydcgghrzeexn`: **283** rows; latest `20261105001928_align_qa_fund_availability_view_acl`.
- Exact common version/name pairs: **247**.
- Production-only: **1** — `20261104222229_reconcile_production_acl_least_privilege`.
- QA-only: **36** — five baseline bookkeeping rows and thirty QA/canonical incremental rows. The full exact list is in the JSON snapshot.

## Interpretation
The 36 QA-only rows must not be copied into Production as a block. They include the five clean-install baseline entries and QA-specific forward repairs. Likewise, the Production-only ACL migration must not be copied to QA merely to equalize counts. Registry parity by row count is not the goal: the goal is a documented, semantically correct deployment history and matching effective schema/security state.

The earlier artifacts dated 2026-11-03 are immutable historical snapshots (247 Production / 47 QA). Their counts are not current and must not be used as the current live ledger.

## SQL payload verification status
The live registry exposes the migration version/name rows and, for the Production-only ACL migration, its recorded SQL statement. The repository contains a draft with the same intended scope, but this report does **not** certify byte-for-byte identity between every historical live payload and the repository archive. That requires a separate payload-by-payload hash comparison. No migration was replayed or applied as part of this report.

## Safety
- Production and QA were queried read-only.
- No ledger rows were inserted, deleted or rewritten.
- No reset, historical replay, branch recreation or QA data cleanup was performed.
- No Production or QA schema change was performed.
