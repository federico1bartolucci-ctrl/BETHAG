# Audit — unit-unassigned installments must block transfer closure

**Date:** 25 November 2026

## Finding

The member-transfer preview includes installments assigned to the selected unit even when `member_id IS NULL`. The transfer closure check and authoritative close helper only counted installments whose `member_id` was in the outgoing-member array. They therefore omitted unit-assigned, unallocated installments.

This created a mismatch: the preview could show an unpaid installment for the unit while the closure guard reported no corresponding open installment and could allow closure. No open PR was found for this exact mismatch.

## Correction

In both `private.check_condominium_member_transfer_closure` and `private.close_condominium_member_transfer`, include:
- outgoing-member installments assigned to the selected unit or legacy unit-null rows;
- unit-assigned installments with `member_id IS NULL`.

Other units remain excluded. The existing outgoing-member array hardening and unit scope are preserved.

## Regression coverage

Extend `scripts/test-member-transfer-closure-unit-scope.mjs` with a partially unpaid unit-A installment having no member:
- baseline reproduces the omission;
- corrected closure totals include the unit-unassigned residual;
- the authoritative close operation remains blocked until that unit-level installment is paid;
- the fixture is cleared before the existing successful-close scenario.

The test is wired into `npm test` through the #440 dependency and runs against isolated PGlite data.

## Dependency and safety

Stacked on PR #451, which includes the primary-member and empty-array guards and depends on #450/#440/#438. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
