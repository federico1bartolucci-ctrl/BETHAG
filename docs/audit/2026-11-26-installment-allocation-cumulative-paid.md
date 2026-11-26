# Audit — cumulative installment payment allocation reconciliation

**Date:** 26 November 2026

## Finding

The payment trigger and manual installment-payment RPC could reconcile an expense allocation from only the currently changed installment. When a single ledger entry was split across multiple installments, paid totals could be overwritten or become inconsistent after later payments and reversals. Concurrent payments against different installments of the same ledger entry also needed a common serialization key.

## Forward-only correction

- Recalculate each affected allocation from the cumulative `paid_amount` of all installments sharing the same workspace, condominium, ledger entry, unit and owner.
- Preserve the unified-owner allocation path, identifying the owner's units by the existing user/email matching rules.
- Revisit every allocation after a reversal, including later allocations after the paid remainder reaches zero, so stale tail amounts are cleared.
- Serialize both trigger-driven and manual RPC reconciliation with the same transaction advisory lock keyed by workspace, condominium and ledger entry.
- Acquire the advisory lock before row-level `FOR UPDATE` locks in both paths to maintain a consistent lock order.

## Migration discipline

The candidate is intentionally stored at:

`supabase/rebuild/drafts/20261126131500_reconcile_installment_allocation_paid_totals.sql`

It uses `CREATE OR REPLACE FUNCTION` for the two existing functions only. It does not edit historical canonical migrations, alter table structure, change grants, or execute against QA/Production. PostgreSQL preserves the existing function owner and privileges when replacing the same function signature.

## Regression coverage

`scripts/test-installment-allocation-cumulative-paid-forward.mjs` executes the trigger function in isolated PGlite and checks:
- cumulative totals split across two installments for a unified owner;
- sequential payment reversals and reset of every allocation tail;
- cumulative reconciliation for a unit/member-specific ledger entry;
- isolation from a different owner on the same unit;
- advisory lock ordering and cumulative aggregation in both trigger and manual-payment RPC bodies.

The PGlite regression is wired into `npm test`. A separate PostgreSQL 17 CI rehearsal applies the draft to a disposable local database and runs concurrent manual-RPC payments and direct trigger inserts against different installments sharing one ledger entry; it also verifies a trigger-driven reversal.

## Promotion gates

Before promotion from draft to a canonical migration, review the SQL against the current Production function definitions and ACLs, rehearse it on isolated PostgreSQL 17 with concurrent payments across different installments of the same ledger entry, and verify the complete allocation/payment invariants. No QA or Production application is authorized by this audit PR.


## Follow-up audit — duplicate unit/member allocation rows

A second defect was reproduced in the non-unified payment path. The trigger and manual registration RPC previously copied the same cumulative paid total into every allocation row matching one unit/member pair. Because the schema has no unique constraint on (workspace, condominium, ledger entry, unit, member), multiple rows can exist for that pair.

Reproduction: two rows of 60 and 40 for the same owner/unit, with a cumulative payment of 70. The previous logic wrote 60 and 40 (100 total paid) instead of 60 and 10 (70 total paid).

The forward draft now distributes the cumulative amount in stable ID order in both the payment trigger and manual RPC, and continues through the remaining rows so reversals clear stale tail amounts. The runtime regression exercises both paths, including reversal back to zero.
