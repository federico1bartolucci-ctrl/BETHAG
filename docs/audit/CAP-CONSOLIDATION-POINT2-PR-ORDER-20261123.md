# CAP consolidation — Point 2: PR order and dependency reconstruction
Date: 2026-11-23

## Scope
Read-only reconstruction from GitHub PR metadata, changed-file lists, and CI records. No code changes or integrations were performed in this point. A referenced phase-6 decision document fetch returned 404; therefore the ordering below is based only on verified PR metadata and file overlap, not that unavailable document.


## Verified PR status
PRs #378–#388 checked in GitHub are open, draft, and not merged.

## Dependency chains and overlap
### Register pagination chain
- #378 (closure document pagination) is based on commit 43cec384028f10e7acc6b36212199c17fb9b94bf.
- #379 (items/suppliers pagination) is stacked on #378 head fca911b6d90a47884309e89280d4e822b295cb8d.
- #380 (work progress hydration pagination) is stacked on #379 head f7da58bafdb676daaf0c1dfd6f1161ad79d96abd.
- All three overlap src/RegisterPage.tsx and package.json; #378/#379 also overlap src/lib/workspacePagination.mjs.
Decision: integrate the chain in order #378 → #379 → #380, or use a cumulative branch whose contents are verified to include all three. Do not integrate the stacked PRs independently/out of order.

### Accounting members chain
- #382 workspace-scope member hydration is based on main SHA 29ae2870618069e59c21c0c1ae5c642be2f1ca1b.
- #383 workspace-scope installment member lookup is stacked on #382 head deb3fdbd2a5297b110fbe7179df6c631dabf0479.
- #387 is a cumulative consolidation PR covering member workspace scope and pagination, and changes src/AccountingPage.tsx, package.json, and adds src/lib/accountingCondominiumMembers.mjs.
Decision: prefer verifying #387's cumulative patch as the single integration candidate; do not separately apply #382/#383 on top of #387. If #387 is not used, apply #382 → #383 sequentially.

### Rendiconto chain
- #381 mixed installments/allocation balance fix is stacked on #306 head 7617f7e21e77d9a2fbe9b070b9a1950aa2232f6a.
- #388 is the cumulative consolidation candidate explicitly documenting #306 plus #381, and overlaps src/AccountingPage.tsx, package.json, and both helper modules.
Decision: verify #388 as a cumulative candidate including #306/#381. Do not cherry-pick #381 alone or separately apply #306 and #381 if #388 is used. #306 itself was not fetched during this point, so this inclusion is supported by the referenced decision documentation and metadata already recorded in the prior audit, not fresh #306 inspection.

### Independent PR candidates
- #384: account deletion active-admin membership pagination; touches delete-account function files and package/tests. Independent by changed-file list from the Register and Accounting groups.
- #385: insurance policy form condominium context stale-state; touches src/main.tsx, tests and package. Independent by changed-file list.
- #386: CAP lookup stale-response prevention; touches src/main.tsx and CAP lookup helper/types/tests. Independent by changed-file list.
No evidence in changed-file metadata of direct file overlap among #384, #385, #386 and the Register/Accounting groups; this is a file-level observation only, not proof of runtime independence.

## Proposed integration order
1. #384 — independent delete-account membership pagination.
2. #385 — insurance form context isolation.
3. #386 — CAP stale lookup response.
4. Register chain #378 → #379 → #380.
5. Accounting members cumulative #387 (instead of separately applying #382 → #383).
6. Rendiconto cumulative #388 (instead of separately applying #306 → #381).
This order is a proposed safe sequence based on the files and PR base/head relationships. If conflict resolution or tests reveal dependencies, revise the sequence based on evidence.

## Verification boundaries
- Changed-file overlap and base/head metadata were retrieved from GitHub.
- CI evidence previously retrieved: builds and baseline safety for several PRs pass; final APP-01..15 workflows shown for #378/#382/#384/#386/#387/#388 were skipped. No cumulative consolidated SHA has been tested in this point.
- No merges, deployment, QA/Production data changes, reset, or manual workflow dispatch.
- No integration action has occurred yet.

## Point 2 result
Dependency order and overlap map documented as an integration plan. Point 2 is closed as planning/documentation only; technical integration is the next point.
