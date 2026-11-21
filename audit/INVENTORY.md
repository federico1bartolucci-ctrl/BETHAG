# BETHAG — Audit defect inventory & coverage register

**Snapshot:** 2026-11-22 (UTC)  
**Repository:** federico1bartolucci-ctrl/BETHAG  
**Branch:** audit/inventory-and-coverage-20261122  
**Purpose:** Establish a single, auditable index of known audit findings and code-area coverage. This is a seed inventory, not a claim that the repository has been fully audited.

## Rules for declaring a finding closed

A finding may be marked **CLOSED** only when all applicable items are evidenced:
1. Concrete defect and affected code identified.
2. Reproduction or credible regression test demonstrates the prior failure.
3. Isolated correction exists on a branch/PR.
4. Test/build/CI results are recorded against the exact commit.
5. Relevant documentation is updated.
6. PR is merged only with owner approval; merge status is tracked separately from technical fix status.

Do not change QA or Production data, reset environments, merge PRs, deploy, or dispatch mutative workflows as part of this audit.

## Status vocabulary

- **UNREVIEWED** — no systematic audit completed.
- **IN REVIEW** — inspection in progress; no complete coverage claim.
- **FINDING** — defect confirmed; inventory entry required.
- **FIX BRANCH** — correction implemented, validation pending.
- **VALIDATED** — exact commit passed relevant tests; merge status tracked separately.
- **CLOSED** — criteria above satisfied and evidence linked.
- **BLOCKED** — requires external access, unavailable test environment, or owner action.

## Coverage register

| ID | Area | Coverage status | Evidence / next action |
|---|---|---|---|
| COV-01 | Authentication, sessions, MFA, password recovery | IN REVIEW | Audit flows, stale session handling, failure paths, rate limits |
| COV-02 | Workspace / tenant boundaries | IN REVIEW | Verify every read/write is scoped by workspace and authorized membership |
| COV-03 | Roles, ACL, RLS, RPC security | IN REVIEW | Review policies, definer functions, privilege grants, fail-closed behavior |
| COV-04 | Condominium CRUD, archive/restore | IN REVIEW | Scope, transitions, archived-record restrictions, concurrency |
| COV-05 | Buildings, stairs, addresses, units, appurtenances | IN REVIEW | Referential integrity, merges, autonomous units, delete/restore |
| COV-06 | Members, owners, tenants, co-owners | IN REVIEW | Invitation, lookup, role changes, stale membership, zero-row mutations |
| COV-07 | Member transfer / subentro | IN REVIEW | Preview races, closure balances, history, compensation/atomicity |
| COV-08 | Accounting ledger and fiscal years | IN REVIEW | Pagination, idempotency, totals, carryovers, partial failures |
| COV-09 | Expense allocations / ripartitions / millesimi | IN REVIEW | Duplicate units, totals, scope, manual-data preservation, rounding |
| COV-10 | Supplier and invoice intake | IN REVIEW | Lookup completeness, locale parsing, linking validation |
| COV-11 | Technical register / works / SAL | IN REVIEW | Validation, concurrency, orphan ledger entries, event failures |
| COV-12 | Documents, backup, restore, storage | IN REVIEW | Pagination, incomplete backups, integrity, sensitive output redaction |
| COV-13 | AI document processing and allocation | IN REVIEW | Modes, file handling, scope, failure cleanup, provider gates |
| COV-14 | Insurance policies | IN REVIEW | Workspace/condominium scoping, validation, pagination, zero-row writes |
| COV-15 | Communications, recipients, email delivery | IN REVIEW | Partial success, status persistence, retry behavior, recipient scope |
| COV-16 | Resident portal and registration requests | IN REVIEW | Workspace scope, stale requests, pagination, permissions |
| COV-17 | Collaborator portal and membership management | IN REVIEW | Pagination, role scope, zero-row mutation feedback |
| COV-18 | Subscription plans, limits, billing state | UNREVIEWED | Audit feature gates, plan switching, invalid states |
| COV-19 | UI state, async loading, race conditions | IN REVIEW | Stale-result guards, workspace/condominium switching |
| COV-20 | Error handling and user feedback | IN REVIEW | Ensure errors/partial success are not reported as full success |
| COV-21 | Application-wide pagination / provider row caps | IN REVIEW | Inventory all unpaginated collection queries; verify complete loads |
| COV-22 | Concurrency, transactions, idempotency | IN REVIEW | Cross-workflow races, retries, compensation and atomicity |
| COV-23 | Edge Functions / webhook / external integrations | IN REVIEW | Auth, retryable failures, secret handling, provider parity |
| COV-24 | Build, CI, tests, migration/bootstrap | IN REVIEW | Exact-head checks, clean-install, migration rehearsal, test coverage |
| COV-25 | Security/privacy, exports, sensitive data | IN REVIEW | Data exposure, secrets, backup output, access control, retention |
| COV-26 | Accessibility, UX consistency, responsive UI | UNREVIEWED | Keyboard, focus, validation, mobile layouts, duplicate controls |
| COV-27 | Performance and large workspaces | IN REVIEW | N+1 queries, caps, expensive renders, large-file paths |
| COV-28 | Release readiness / production parity | BLOCKED / OWNER-GATED | No Production mutation; compare versions, gates, approval, runbook |

## Known audit PR snapshot

The GitHub query returned **100 open PRs** in the first page (sorted by most recently updated), with visible numbers **#96–#198, excluding gaps**. These PRs are not automatically 100 unique defects: several titles indicate overlapping or stacked fixes, repeated iterations, and dependencies. They must be deduplicated and grouped by underlying root cause before defect counts are reported.

### Known open PRs — grouped by area

- **State loading / pagination / row caps:** #156, #157, #160, #182, #185, #191, #192, #193, #194, #142, #147, #148, #150, #151, #154, #155, #173, #180.
- **Zero-row mutations / scoping / integrity:** #188, #189, #190, #195, #198, #153, #146, #144, #143.
- **Accounting, SAL, ledger, transfer integrity:** #97, #102, #104, #106, #109, #113, #115, #116, #117, #118, #162, #163, #165, #166, #167, #168, #169, #170, #172, #174, #175, #184, #186, #187.
- **Technical register error/partial-success feedback:** #103, #105, #110, #111, #112, #119, #120, #123, #124, #176, #178, #179.
- **Documents, backup, restore:** #98, #101, #108, #114, #121, #164, #181, #183.
- **Invitations, membership, workspace scoping, async races:** #127, #128, #129, #130, #131, #132, #133, #136, #138, #139, #140, #141, #161.
- **Email / webhook reliability:** #135, #137, #177.
- **AI / allocation / locale / intake:** #143, #144, #145, #146, #154, #158, #170, #171, #182, #196.
- **Insurance:** #157, #172, #176, #188, #198.
- **Miscellaneous / cross-area:** #134, #149 (not present in snapshot), #152 (not present in snapshot), #153, #159, #183.

> The above groupings are provisional, based on PR titles. Some PRs appear in multiple groups; this is deliberate and must be reconciled to root-cause findings. PRs #149 and #152 were not returned in the open-PR snapshot and are explicitly not counted as open.

## Defect ledger (to be filled as findings are confirmed)

| Defect ID | Area | Summary | Severity | Repro | Fix branch / PR | Exact SHA | Test evidence | Status |
|---|---|---|---|---|---|---|---|
| — | — | No consolidated root-cause ledger yet | — | — | — | — | OPEN |

## Audit execution order

1. Reconcile open PR snapshot against underlying root causes; identify stacked dependencies and repeated iterations.
2. Inspect high-risk data integrity/security paths first: accounting/ledger, transfers, workspace scoping, zero-row writes, RLS/RPC.
3. For each unique root cause, create a ledger row and link all duplicate/stacked PRs.
4. Continue code inspection in uncovered areas, particularly plan gates, security/privacy, accessibility, performance and release parity.
5. Run exact-head CI checks where possible; distinguish CI from local reproduction and from final QA.
6. Keep QA and Production untouched; final launch readiness is a separate owner-approved gate.

## Audit dashboard — initial baseline

- Open PR snapshot records: **100** (first-page query; pagination beyond this page not yet verified).
- Unique confirmed defects represented by these PRs: **NOT COUNTED YET** (root-cause deduplication required).
- Confirmed closed defects in this inventory: **0** (the register is newly created; historical evidence is not yet reconciled).
- Coverage areas: **28**.
- Areas fully audited and certified: **0** (no certification is made from partial inspections).
- QA / Production modifications: **0** by this inventory operation.

This file is a living audit record. Update it after each confirmed finding, test result, coverage review, or status change.
