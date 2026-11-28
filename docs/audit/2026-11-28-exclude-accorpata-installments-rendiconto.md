# Exclude superseded consolidated installments from the Rendiconto

Date: 2026-11-28

## Finding

The accounting UI and the fiscal-year closure RPC already treat installment rows with status `Accorpata` as superseded:
- the arrears calculation excludes them;
- the installment list hides payment actions for them;
- the fiscal-year closure check excludes them from installment amount and paid totals.

The Rendiconto did not apply the same rule. Its global totals included every installment row, and both `calculateLedgerExpensePaid` and `calculateRendicontoUnitBalances` counted paid amounts from superseded rows.

When a legacy per-unit installment remains marked `Accorpata` beside its active unified owner installment, the old row could be counted again. This could inflate scheduled and paid totals and make the per-unit balance appear settled even though the active unified installment still had an outstanding residual.

## Reproduction

The regression fixtures use one 100-euro allocation with:
- a superseded per-unit row: 100 euros, 100 paid, status `Accorpata`;
- an active unified owner row: 100 euros, 30 paid, status `Da pagare`.

Before the correction, the unit report counted 200 euros of installments and treated the allocation as fully paid. The correct report counts the active 100-euro installment, 30 paid, and 70 outstanding.

The expense summary fixture also verifies that the superseded 100-euro payment is not used to report the linked 100-euro expense as paid.

## Correction

- Introduce `getReportableAccountingInstallments`, excluding only rows whose status is exactly `Accorpata`.
- Apply it to Rendiconto's selected installment collection, so global scheduled/paid/residual totals use the same active set.
- Apply the same filter defensively in the expense-paid and per-unit balance calculation helpers.
- Preserve all other statuses and standalone installment behavior.

## Validation

- Extend `scripts/test-accounting-expense-paid-summary.mjs`.
- Extend `scripts/test-accounting-rendiconto-unit-mixed-installments.mjs`.
- Both scripts are already registered in `npm test`; the tests also assert that registration.

## Safety

- Isolated branch: `audit/exclude-accorpata-installments-rendiconto-20261128`.
- No database schema or migration changes.
- No QA or Production access or writes.
- No merge or deploy.
