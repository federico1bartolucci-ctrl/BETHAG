# PR Root-Cause Reconciliation — Initial Sample

**Snapshot date:** 2026-11-22  
**Repository:** federico1bartolucci-ctrl/BETHAG  
**Source:** Direct inspection of PR metadata and patches for #189–#198 (excluding #199 etc.; open-PR listing currently returned first 100 items).

## Scope and limitations

This is a patch-level reconciliation of a sample of the newest open PRs, not a complete PR inventory. Titles/patches were inspected; CI results and full runtime reproduction have not been verified in this step. Therefore findings below are **provisional root-cause groups**, not certified bug counts.

## Reconciled sample

| PR | Change surface | Root-cause family | Provisional relationship | Review note |
|---|---|---|---|---|
| #198 | Insurance policy UPDATE/DELETE | Workspace + condominium scoping | Distinct mutation scope guard | Patch adds both scopes; test is source-pattern assertion |
| #197 | Work save/history | Partial-success reporting | Likely separate failure-reporting case | Needs review of full behavior/test |
| #196 | Condominium AI document analysis mode | Storage-mode dispatch | Distinct workflow dispatch | Unit test covers dispatch; main integration assertion is source-pattern based |
| #195 | Backend workspace/portal deletes | Zero-row mutation feedback | Same family as #190, different deletion surfaces | Patch requests returned rows and rejects empty results |
| #194 | Backend hydration accounting tables | Pagination / capped collection loading | Systemic pagination family; distinct table set | Test checks source calls; pagination helper behavior should be exercised |
| #193 | Accounting expense allocations | Pagination / capped collection loading | Same systemic family, distinct query | Mock tests 1001 records, deterministic ordering and page failure |
| #192 | Collaborator memberships hydration | Pagination / capped collection loading | Same systemic family, distinct query | Adds role filter to shared pagination helper |
| #191 | Condominium works hydration | Pagination / capped collection loading | Same systemic family, distinct query | Mock tests pagination helper; dependency branch |
| #190 | Condominium unit delete | Zero-row mutation feedback | Same family as #195, separate operation/helper | Tests success, zero rows, and DB error |
| #189 | Collaborator mutations | Zero-row mutation feedback / state consistency | Separate mutation surface | Local state is guarded by returned row; source tests are pattern-oriented |

## Root-cause groupings (sample only)

### RC-PAGINATION — Queries may return incomplete collections at provider row limits
PRs in the inspected sample: **#191, #192, #193, #194**.

These address distinct collection-loading surfaces but share a systemic root cause: single-page or capped queries may silently omit records in larger workspaces. Do not count this as one defect only, because each query path can independently fail; track both the systemic risk and each concrete query surface.

### RC-ZERO-ROW — Mutations can appear successful when no row changed
PRs in sample: **#189, #190, #195**.

The group includes distinct mutation paths (collaborator operations, condominium-unit deletion, generic workspace/portal deletion). Shared symptom does not make them identical defects. Each surface needs test evidence.

### RC-SCOPE — Insurance-policy mutations need explicit tenant/condominium constraints
PR in sample: **#198**.

The patch scopes updates and deletes by id + workspace + condominium. The regression script checks source patterns, not runtime authorization behavior; stronger tests should exercise the query builder and prove mismatched scope yields no mutation.

### RC-AI-MODE — Analysis-only AI mode dispatch
PR in sample: **#196**.

The dispatcher selects temporary upload analysis for `analysis` mode and stored-document analysis for `both`. Existing tests cover dispatch calls but the main integration check is static. End-to-end cleanup/storage behavior still needs verification.

### RC-PARTIAL-SUCCESS — Persisted primary operation and failed secondary history/event
PR in sample: **#197**.

Need inspect patch and behavior before classifying as a unique defect. Partial-success reporting is not automatically a root-cause fix; verify the main mutation and history/event operation ordering and whether retries can duplicate the primary mutation.

## Test-quality observations from the inspected patches

1. Some regression scripts assert source-code patterns (regex/static structure). These are useful guards but cannot prove the behavior at runtime.
2. #193 includes a mock pagination test for 1001 rows, deterministic order, workspace scoping and a page-failure path (inspect remaining test before making coverage claims).
3. #190 includes behavior-oriented helper tests for success, zero-row result, and database error.
4. #196 tests dispatcher behavior, but its integration assertion is source-pattern based.
5. #198 regression script verifies query scopes through source patterns, not runtime behavior.

## Next actions

1. Inspect #197 in full and determine whether it duplicates other partial-success/history failures.
2. Inspect PR dependencies and branch base SHAs for #189–#198 to establish the actual stacking/merge sequence.
3. Continue sample reconciliation down the open PR list, prioritizing root causes rather than titles.
4. Review source query inventory for unpaginated collections; search tool results alone are not enough, so use targeted file retrieval and confirm each query context.
5. Convert provisional root-cause groups to confirmed entries only when reproduction/tests/evidence are available.
6. Update the central inventory/dashboard with defensible counts after reconciliation.

## Counts for this sample

- PRs inspected: **10** (#189–#198).
- Provisional root-cause families: **5**.
- Confirmed defect count: **not assigned** (patch inspection does not establish full reproduction/validation).
- Root-cause family members: pagination #191–#194; zero-row #189–#190/#195; scope #198; AI dispatch #196; partial-success #197 (pending detailed inspection).
- Runtime validation of these PRs in this audit step: **not performed**.
