# Phase 6 — Rendiconto consolidation decision (2026-11-23)

## Selected cumulative line
Use PR #381 head `4f7ef500d83a362e5d4773c2a65a902ada688f96`, which is stacked on PR #306 head `7617f7e21e77d9a2fbe9b070b9a1950aa2232f6a`.

## Scope
- #306: partial-payment/residual calculation in the expense paid-summary.
- #381: mixed unit allocations and installment handling, including residuals for allocations without installment rows.

## Functional scenario to preserve
When one unit has allocation A = 100, paid 30, with installments, and allocation B = 40, paid 10, without installments, residual must include both unpaid portions (70 + 30 = 100), not omit the second allocation. Paid total is 40.

## Consolidation decision
Keep #306 and #381 together in the cumulative order. Do not cherry-pick #381 alone or integrate the two independently. The standalone #381 helper and regression are complementary to #306's paid-summary behavior.

## Verification limits
Patch comparison and prior PR metadata only. No local build, runtime execution, or CI certification performed during this step. Authenticated QA is not part of this branch.

## Safety
No merge to main, deployment, or QA/Production changes.
