# Audit — transfer closure must always include the primary outgoing member

**Date:** 25 November 2026

## Finding

After the empty-array fallback was corrected, another inconsistency remained in the transfer closure functions: a non-empty `data->'outgoing_member_ids'` array could still omit the row's authoritative `outgoing_member_id`. The closure check and close helper trusted the array as complete, so the primary member's open installments, allocations and fiscal carryovers could still be excluded.

The transfer creation function already ensures the primary outgoing member is included, but the read/check/close path did not defend against legacy, imported or manually inconsistent rows. No open PR was found for this specific missing-primary case.

## Correction

- Read `t.outgoing_member_id` alongside the JSON array in both private closure functions.
- Preserve the array when it already contains the primary member.
- Prepend the primary member when it is missing.
- Retain the empty-array fallback and reject a missing primary ID rather than silently checking no member rows.

## Regression coverage

Extend `scripts/test-member-transfer-closure-unit-scope.mjs` with a transfer whose JSON array contains a different member but omits the primary `outgoing_member_id`:
- baseline reproduction confirms the primary member's balances are omitted;
- corrected check restores the primary member's selected-unit and legacy unit-null balances;
- authoritative close rejects the inconsistent transfer while those balances remain open.

The existing empty-array regression from PR #450, unit-scope checks and ownership-share compatibility remain covered.

## Dependency and safety

Stacked on PR #450, which fixes empty arrays and depends on #440/#438. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
