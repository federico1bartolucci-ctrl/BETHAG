# Audit — scope transfer-confirmation accounting snapshot to selected unit

**Date:** 25 November 2026

## Finding

PR #454 validates every outgoing member ID before confirmation, and PR #455 adds unit-unassigned allocations to the transfer snapshot. However, the confirmation function still aggregated member-linked installment rows and extraordinary allocations by member ID without consistently constraining the selected unit.

The existing scope triggers validate workspace/condominium ownership but do not require a member-linked financial row's `unit_id` to match the member's unit. Consequently, rows assigned to another unit in the same condominium could be copied into a transfer for the selected unit. The preview and closure paths already apply selected-unit scoping.

## Correction

The forward-only candidate migration `20261125102000_scope_member_transfer_confirmation_snapshot_to_unit.sql` is based on the #455 confirmation function, preserving its unit-unassigned allocation fields. It adds workspace/condominium and selected-unit filters to:

- installments due before, paid before, residuals, future installments and outstanding totals;
- member-linked extraordinary allocations and their ledger-entry join;
- unit-unassigned fiscal carryovers.

Member-linked rows with `unit_id IS NULL` remain included for legacy compatibility. Unit-unassigned allocations and their outstanding total remain exactly as added by #455.

## Regression

The existing `scripts/test-member-transfer-confirm-outgoing-member-ids.mjs` is extended and remains wired into `npm test`.

It first applies the pre-fix #455 function and reproduces the contamination using Unit B records linked to a Unit A owner. It then applies the new candidate and verifies:

- Unit B installments are excluded from Unit A's due-before, paid-before, residual, future and outstanding totals;
- Unit A unit-unassigned installments remain included;
- legacy member-linked rows with NULL `unit_id` remain included;
- Unit B member-linked allocations are excluded from the extraordinary snapshot;
- selected-unit and legacy unit-null allocations remain included;
- unit-unassigned allocations and carryovers remain preserved and unit-scoped.

## Dependency and safety

Stacked on PR #455, which itself is based on PR #454. Keep Draft and integrate only in dependency order. SQL remains under `supabase/rebuild/proposed-forward-migrations`, outside live `supabase/migrations`. No QA/Production access or writes, no merge, deploy, reset or manual workflow dispatch.
