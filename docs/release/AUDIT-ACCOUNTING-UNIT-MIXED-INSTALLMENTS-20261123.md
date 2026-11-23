# Audit: mixed allocations and installment balances by unit

## Finding
The Rendiconto per-unit calculation used a unit-wide boolean to decide whether to calculate the balance from installments or from allocations. If a unit had at least one installment, unpaid allocations for other ledger entries without installment plans were omitted from the residual.

## Reproduction
For one unit: allocation A = 100, paid 30, with installments 100/paid 30; allocation B = 40, paid 10, without installments. The baseline calculation returned residual 70, omitting B's 30 unpaid. Correct residual is 70 + 30 = 100 and total paid is 30 + 10 = 40.

## Fix
Extract the per-unit calculation to a pure helper. Installment-linked allocations are represented by their installment balances; allocations for other ledger entries contribute their own unpaid residual and paid amounts. Member-linked installments retain proportional splitting with the final cent remainder assigned to the last allocation. Carryovers remain included.

## Runtime regression
Added `scripts/test-accounting-rendiconto-unit-mixed-installments.mjs` to `npm test`. It reproduces the old 70 balance, asserts the corrected 100, checks no double-counting when fully covered, verifies member-installment cent allocation, and preserves carryover calculation.

## Safety
Draft PR stacked on #306. No merge, deploy, QA or Production data changes.
