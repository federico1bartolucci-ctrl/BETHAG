# Allocation source-ledger integrity with generated installments — 2026-11-27

## Finding

An expense allocation with generated installments was protected against changes to its amount and unit, but its source ledger expense could still be changed. The generated installments remained linked to the original expense while the allocation pointed to another one, breaking referential/accounting consistency.

## Correction

- Extend the mutation guard to include the source ledger entry as well as unit and amount.
- Keep the installment lookup scoped by workspace, condominium, and the original ledger expense.
- Fail closed if the installment count is absent or malformed; only a confirmed zero count permits reassignment.
- Preserve the current zero-row-safe update path and workspace/condominium predicates.

## Regression coverage

- Runtime helper tests cover no-installment reassignment, unchanged allocation, amount/unit/source changes, and unknown/malformed counts.
- The production handler wiring and guard ordering are verified.
- Test is included in the npm test chain.

## Safety

Frontend-only correction and local tests. No schema changes, migrations, QA/Production access or writes, Supabase deployment, reset, or paid service activation.
