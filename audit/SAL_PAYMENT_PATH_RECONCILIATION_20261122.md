# Audit correction — SAL payment path reconciliation

**Date:** 2026-11-22

## Reassessment of the previously suspected issue

The previously reported `registerProgressPayment()` two-step payment insertion/linking is **not a newly discovered defect** and must not be counted as a new finding.

Open PRs already cover this path:
- **PR #162**: compensation for orphan ledger entries when SAL linking fails.
- **PR #186**: strengthens the helper to check for zero-row updates and compensate, with regression tests.
- **PR #97** is a separate atomic/idempotent RPC for `recordProgressPayment()`, not the same handler.

The main-branch source currently still contains the older two-step `registerProgressPayment()` implementation. The isolated PR #186 proposes replacing that flow with a helper that verifies the update row and deletes the inserted ledger row on failure. Since the correction is already represented by open PRs, the audit will not create another PR or count this as an additional unique defect.

## Audit action

- Reconcile this finding with PRs #162 and #186.
- Treat the underlying defect as **already identified / fix pending review**, not as a new finding.
- Continue searching for a defect outside the already-open PR root causes.
- No QA or Production data/environment changes, merge, or deployment were performed.
