# Rendiconto partial payments and mixed allocations — 2026-11-26

## Findings

- The global paid-expense summary counted an expense only when its ledger status was exactly `Pagato`, ignoring partial payments recorded against linked installments.
- The per-unit Rendiconto used a unit-wide switch: once any installment existed for a unit, it calculated that unit's residual only from installments. This omitted unpaid allocations belonging to other ledger entries without installment plans.
- Partial installment schedules could be mistaken for complete coverage of an allocation, and linked schedules exceeding the allocation could inflate the residual.

## Correction

- Derive paid/unpaid expense totals from linked installment payments where present, cap recognized payments at the expense amount, and retain the ledger status fallback for expenses without linked installments.
- Calculate per-unit balances by ledger-entry/unit allocation group, combining installment coverage with uncovered allocation residuals.
- Cap linked installment coverage at its allocation, while keeping standalone manual installments additive.
- Preserve proportional distribution of member-linked installments and assign rounding remainders to the final allocation.
- Preserve carryover-only units and carryover debit/credit treatment.

## Regression coverage

- Partial, fully paid, unpaid, and overpaid linked expense cases.
- Mixed allocations where one ledger entry has installments and another does not.
- Fully covered and partially covered allocations, multiple installment rows, over-scheduled linked plans, and standalone manual installments.
- Member-linked proportional splitting, cent remainders, unlinked allocations, and opening carryovers.

## Safety

This is an application/helper/test/documentation change only. No migrations, QA/Production database access or writes, resets, Supabase deployments or paid service activation.
