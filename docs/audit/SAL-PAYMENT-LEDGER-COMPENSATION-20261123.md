# SAL Payment Ledger Compensation — 2026-11-23

## Finding
Both SAL payment flows inserted a paid ledger entry and then updated the SAL record. If that second write failed, the ledger could remain orphaned. In the payment form flow, a subsequent work-event write could fail after the SAL and ledger were updated, while the UI still reported failure.

## Correction
- When the SAL update/link fails, delete the just-created ledger entry as compensation.
- In the payment form flow, when work-event logging fails, restore the SAL's prior paid amount/payment-entry reference and delete the inserted ledger entry.
- Every compensating write is workspace scoped.
- If rollback itself fails, report both the original error and rollback failure explicitly.

## Regression
Static regression guards check both payment pathways, compensation branches, workspace scoping, and rollback-failure reporting. Wired into `npm test`.

## Verification
Source, test, package and documentation are re-fetched and statically inspected. Runtime test/build/CI required before closure.

## Safety
Draft only; no merge, deployment, QA/Production changes or resets.
