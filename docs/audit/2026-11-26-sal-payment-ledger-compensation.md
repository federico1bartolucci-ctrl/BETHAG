# SAL Payment Ledger Compensation — 2026-11-23

## Finding
Both SAL payment flows inserted a paid ledger entry and then updated the SAL record. If that second write failed, the ledger could remain orphaned. In the payment form flow, a subsequent work-event write could fail after the SAL and ledger were updated, while the UI still reported failure.

## Correction
- When the SAL update/link fails, delete the just-created ledger entry as compensation.
- In the payment form flow, when work-event logging fails, restore the SAL's prior paid amount/payment-entry reference and delete the inserted ledger entry.
- Every compensating write is workspace scoped.
- Apply optimistic concurrency checks to the SAL before changing cumulative paid amount or linking a ledger entry, preventing concurrent payment attempts from silently overwriting each other.
- If rollback itself fails, report both the original error and rollback failure explicitly.

## Regression
Static regression guards check both payment pathways, compensation branches, workspace scoping, and rollback-failure reporting. Wired into `npm test`.

## Verification
Source, test, package and documentation are re-fetched and statically inspected. Runtime test/build/CI required before closure.

## Safety
Draft only; no merge, deployment, QA/Production changes or resets.


## Follow-up concurrency audit — 2026-11-23

### Finding
The event-log failure compensation in `registerProgressPayment()` used an unconditional SAL update followed by ledger deletion. If another payment updated the SAL after the first payment was committed but before compensation, the rollback could overwrite the concurrent paid amount/reference and delete the first payment's ledger row.

### Fix
- Extract the rollback to `src/lib/salPaymentCompensation.mjs`.
- Compare the current SAL paid amount and `payment_entry_id` with the exact state written by this payment before reverting.
- If a concurrent change is detected, do not delete the ledger entry; preserve the current SAL and both ledger entries and report that history reconciliation is required.
- If ledger deletion fails after SAL rollback, restore the SAL to the committed payment state using a second compare-and-set. Report incomplete compensation explicitly if this restoration also fails.

### Runtime regression
The test now executes the compensation helper against a Supabase mock. It covers normal rollback, the old concurrent-payment clobbering scenario, ledger-delete failure restoration, and rollback update failure. Static integration checks verify the active payment flow calls the helper and that the legacy flow's guard remains intact. The test remains wired into `npm test`.

### Local verification
Isolated Node runtime regression: PASS. Full repository clone and `npm test` unavailable in this execution environment because GitHub DNS resolution failed. Exact-head CI is required to certify the updated branch.

### Safety
Draft branch only; no QA/Production changes, merge, deployment, reset, or manually dispatched workflow.
