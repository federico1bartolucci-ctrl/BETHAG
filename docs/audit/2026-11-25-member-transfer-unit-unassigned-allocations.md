# Audit — include unit-unassigned expense allocations in member transfer

**Date:** 25 November 2026

## Finding

`condominium_expense_allocations.member_id` is nullable while `unit_id` identifies the unit. The transfer preview, confirmation snapshot and closure gate considered allocations linked to outgoing member IDs, but omitted unpaid allocations assigned to the selected unit with `member_id IS NULL`.

This was inconsistent with the existing treatment of unit-unassigned installments and fiscal carryovers. A whole-property transfer could be confirmed and closed while a unit-level expense allocation remained unpaid, without showing it in the transfer review or preserving it in the accounting snapshot.

No open PR covered unit-unassigned expense allocations in the transfer flow.

## Correction

Three forward-only candidate migrations:

- `20261125090000_include_unit_unassigned_allocations_in_transfer_closure.sql`: includes selected-unit unassigned allocations in both closure-check and authoritative close totals. Other-unit allocations remain excluded.
- `20261125090001_include_unit_unassigned_allocations_in_transfer_confirmation.sql`: preserves unit-unassigned allocation details and outstanding totals in the transfer accounting snapshot; scopes member-linked allocation snapshot totals to the selected workspace/condominium/unit.
- `20261125090002_include_unit_unassigned_allocations_in_transfer_preview.sql`: exposes unit-unassigned allocation details, outstanding total and a review flag in the preview.
- `src/MemberTransferPanel.tsx`: aggregates the new review flag and renders the unassigned allocations in both the pre-transfer preview and the preserved accounting snapshot.

All SQL remains under `supabase/rebuild/proposed-forward-migrations`; no live migration file is changed.

## Regression coverage

Existing `npm test` suites are extended:

- `scripts/test-member-transfer-closure-unit-scope.mjs`: reproduces the old close helper ignoring an unpaid unit-unassigned allocation; verifies the corrected closure check includes only the selected unit's residual and the authoritative close blocks until paid.
- `scripts/test-member-transfer-preview-scope.mjs`: verifies the preview lists the selected unit's unassigned allocation, excludes another unit's allocation, reports the residual, raises the review flag and asserts the UI renders the new field.
- `scripts/test-member-transfer-confirm-outgoing-member-ids.mjs`: verifies the confirmation snapshot preserves unit-unassigned allocation details and residual.

All fixtures run in isolated PGlite; no remote database is used.

## Dependency and safety

Stacked on PR #454, which includes PR #453's outgoing-member scope guard. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
