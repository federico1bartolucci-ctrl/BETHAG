# Audit PR consolidation roadmap — 23 November 2026

## Purpose
Document a dependency-aware integration path for the currently reviewed audit PRs. This is a planning artifact, not a claim that PRs are merged or runtime-validated.

## Confirmed PR dependency graph
- **#333**: cumulative installment payment allocation reconciliation; base `main`.
- **#343**: reconciliation guard; base branch is the head of **#333** (`audit/accounting-allocation-payment-sum`). Integrate after #333.
- **#236 → #342**: stale accounting-load context guard (#236) is the base of #342's accounting settings reset. Integrate #236 first, then #342.
- **#344**: atomic SAL payment registration; base `main`. Keep in the SAL/accounting review group; do not merge until migration and concurrency behavior are reviewed.
- **#338–#341**: independent PRs from main but overlapping in `src/lib/bethagBackend.ts`; consolidate in a single backend integration pass, resolving shared-file changes and retaining each regression test.
- **#345 → #346 → #347**: password recovery session handling, document-upload rollback, then condominium-unit pagination. This chain is confirmed by the PR base/head refs.

## File-overlap evidence
- `package.json` is modified by all inspected PRs (#333, #343, #344, #338–#342, #347), so test-script edits must be consolidated rather than cherry-picked blindly.
- `src/lib/bethagBackend.ts` is shared by #338, #339, #340, #341 and #347. These changes must be applied together or conflict-resolved in one integration branch.
- Accounting UI overlaps in `src/AccountingPage.tsx` between #236 and #342.
- Accounting SQL/function changes (#333, #343, #344) require one combined review of transaction locks, cumulative allocation reconciliation, and atomic SAL/payment registration before migration acceptance.

## CI evidence observed during review
- Build and PostgreSQL bootstrap checks were reported successful for the inspected PRs.
- Full final-QA checks were skipped on several PRs. Build/bootstrap success is not proof of browser, authenticated-role, or production readiness.
- No Production database or QA data was modified during this audit.

## Proposed integration order
1. Review #333 accounting reconciliation SQL and its baseline/security-parity allowances.
2. Integrate #343 on top of #333 and review locking/reconciliation behavior as one accounting change.
3. Review #344 separately, then combine only after SAL/payment atomicity is proven compatible.
4. Integrate #236, then #342, preserving stale-load protections and reset-on-missing settings.
5. Consolidate #338–#341 backend mutation/error guards in one pass.
6. Integrate #345, #346, #347 in dependency order.
7. Rebuild the test script once, run CI on the integration candidate, and require full QA before any merge to main.

## Explicit non-goals
- No merging to `main`.
- No Production migration execution.
- No QA reset or destructive test-data operation.
- No marking any PR closed/complete without evidence.
