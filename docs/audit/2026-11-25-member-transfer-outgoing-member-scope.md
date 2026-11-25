# Audit — validate outgoing member IDs before transfer closure

**Date:** 25 November 2026

## Finding

The authoritative transfer-close helper trusted `data->'outgoing_member_ids'` and archived every UUID in that array using `WHERE id = v_outgoing_id`. It did not verify that each referenced member belonged to the transfer's condominium and selected unit.

A stale, imported or inconsistent transfer could therefore archive a member from another unit or even another condominium/workspace. Non-existent and NULL IDs were silently ignored while the transfer was still marked closed. The financial checks were scoped to the selected condominium/unit, but the archival writes were not.

No open PR covered this archival-scope mismatch.

## Correction

The new forward-only candidate migration `20261125073000_validate_member_transfer_outgoing_member_scope.sql`:

- rejects NULL, missing, cross-condominium and other-unit outgoing member IDs;
- permits legacy members with `unit_id IS NULL` only when they belong to the same condominium;
- applies the same validation to the closure-check RPC and the authoritative close helper;
- locks only matching in-scope member rows before validating in the close helper, preventing their scope from changing between validation and archival without locking unrelated tenants' rows;
- scopes each final member read/update by condominium and selected unit;
- fails closed with `TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH`.

## Regression coverage

The existing `scripts/test-member-transfer-closure-unit-scope.mjs` is extended and remains wired into `npm test`.

It first reproduces the defect against the prior closure functions from the #452 stack:
- same-condominium member assigned to another unit is archived;
- member belonging to another condominium/workspace is archived;
- non-existent and NULL IDs are silently accepted.

It then applies the new candidate migration and verifies both the closure-check RPC and close helper reject all four cases. Each rejected case must leave the transfer in `Confermato`, keep `closed_at` NULL and leave all members active. Existing unit-scope, primary-member, empty-array, unit-unassigned-installment and ownership-share regressions remain in the same suite.

## Dependency and safety

Stacked on PR #452 (which itself includes #451/#450/#440/#438). Draft only. The SQL remains under `supabase/rebuild/proposed-forward-migrations`, not the live `supabase/migrations` directory. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
