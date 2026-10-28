# BETHAG — Application smoke-test and cutover approval record

**Status:** PREPARED — TEST EXECUTION AND APPROVAL PENDING  
**Scope:** Run against an isolated test environment only. Do not use Production for negative tests or test data mutations.

## 1. Environment and build evidence

- [ ] Record the exact commit SHA and deployment/build artifact.
- [x] Restore gate disposition (decision recorded 2026-10-27): local Docker/PostgreSQL logical restore was completed and verified; per the user's explicit decision, treat the backup-restore prerequisite as SATISFIED for this cutover without paying for a new Supabase project. Provider-backed physical restore was not performed; its residual risk is accepted for this release and must not be misrepresented as a physical-restore test.
- [ ] Confirm schema, RLS, function ACL, owner and default-privilege evidence is attached.
- [ ] Confirm CI build and PostgreSQL 17 bootstrap are green on the exact release commit.
- [ ] Confirm Security Advisor findings are reviewed; Production's current authenticated SECURITY DEFINER RPC warning remains until the approved forward migration changes the RPC to SECURITY INVOKER.

## 2. Automated public-interface smoke test (partial coverage)

- CI workflow: [run 40496475638](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40496475638), commit `6baf951dfeeee5dcadc50a26ebab9f2dffba155f` — **PASS** (build, browser smoke, PostgreSQL 17 bootstrap, all 11 canonical migrations, ACL postconditions and guarded ledger rehearsal).
- Added `scripts/test-browser-public-smoke.mjs`, run in CI after the production build using a local Vite preview and headless Chromium.
- Added a disposable PostgreSQL RLS regression in `scripts/test-postgres-bootstrap.mjs`: as `authenticated`, a workspace administrator can read its own synthetic condominium but cannot read or update another workspace's row; all fixtures are rolled back. CI run [40499943587](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40499943587) passed the `postgres-bootstrap` job with this regression. This is isolated SQL-level evidence, not a substitute for authenticated browser APP-01–APP-15.
- Automated checks cover the public landing page, opening the login panel, rendering the administrator/collaborator/resident role selectors, rejecting an empty login with validation feedback, rejecting missing and expired recovery links, accepting a valid legacy hash-based recovery link, rejecting mismatched recovery passwords before `updateUser` can run, and completing the success UI path with exactly one mocked `updateUser` and local `signOut` call. The recovery-flow tests use synthetic sessions and mocked Supabase calls; no real account is modified.
- This is intentionally only a public-interface smoke test. It does not authenticate against Supabase or prove real role authorization, resident data isolation, accounting flows, document storage, or member-transfer behavior. APP-01–APP-15 remain NOT RUN until the remaining isolated role-based tests have evidence.
- Supabase QA environment discovery (2026-10-27): existing branches `bethag-continuity-qa` (`srkucrdcoswlozifvztr`), `bethag-develop` (`wvokvcfglduxmjxlnfeh`), `bethag-member-transfer-qa` (`gcorwfvnslnehcxmtixn`) and `bethag-migration-reconciliation-qa` (`mxhciszzpqzvsaqcnwhg`) are active but report `with_data=false`; public table row counts are zero. Their migration ledgers also contain environment-generated version/name histories that differ from the frozen canonical 11-migration sequence. They are not evidence of completed APP-01–APP-15, and none should be treated as the production cutover target.

- **Closed accounting period guard — PASS (live QA SQL subset, 2026-10-27):** in a rolled-back synthetic transaction, attempted updates to both a ledger entry and an installment in a closed fiscal year were rejected by the database trigger; both amounts remained unchanged. Follow-up queries confirmed zero synthetic workspaces, condominiums, fiscal years, ledger entries, or installments remained. This is database guard evidence only; APP-07 browser workflow remains NOT RUN.
- **QA Security Advisor — historical PASS, current warning recorded (2026-10-28):** the 2026-10-27 check returned `lints: []`; a fresh check on `bethag-continuity-qa` (`srkucrdcoswlozifvztr`) on 2026-10-28 now reports `auth_leaked_password_protection` (WARN: leaked-password protection disabled). This setting is an Auth configuration item, not a SQL migration; enable it in the QA project's Auth password/security settings and rerun the advisor before treating the current QA advisor result as clean. This QA finding does not establish Production's current advisor state.

- **QA PUBLIC EXECUTE review — PASS (2026-10-28):** read-only catalog inspection found exactly two routines executable by `PUBLIC`: `public.normalize_zero_ownership_owner()` and `public.preserve_closing_condominium_member_history()`. Both are ordinary `SECURITY INVOKER` functions intended as trigger helpers; no other public/private routine was found with `PUBLIC` EXECUTE. This verifies the QA branch only; Production ACLs still require their own evidence after the approved migration rehearsal.

- **Real-auth account readiness — BLOCKED (2026-10-28):** the three existing QA Auth users have linked profiles, but all profiles are `resident`; `workspace_members` and `portal_access` contain zero rows and no condominiums exist in QA. Do not repurpose these accounts or elevate roles via direct SQL. APP-01–APP-15 remain NOT RUN for authenticated browser testing until dedicated QA admin/collaborator/resident accounts and valid synthetic workspace fixtures are provisioned through the supported Auth/application flow.

- **Member-transfer database checks — PASS (isolated QA, 2026-10-27):** a user from a different workspace was denied with `FORBIDDEN` without changing the transfer; the authorized workspace administrator closed the synthetic transfer and the owner states were updated correctly; a second transfer with an unpaid installment was rejected and its state remained unchanged. Follow-up SQL confirmed the transaction left zero synthetic workspace, transfer, and installment rows. This is database/function evidence only; browser tests APP-08–APP-11 remain NOT RUN.

- **QA document-storage setup and RLS — PASS (2026-10-27):** inspection found the continuity QA branch had neither the private `bethag-documents` bucket nor the four `storage.objects` policies present in Production. Applied a QA-only repair (private 100 MiB bucket; SELECT for authorized workspace document users or residents with permission to read a shared document; INSERT/UPDATE/DELETE limited to workspace users with document-management permission). In a rolled-back synthetic transaction, a collaborator with `documenti` permission read an in-workspace object but not a foreign-workspace object; a resident read the shared object but not a private or foreign-workspace object. Post-check: bucket exists, all four policies are present, and zero synthetic objects/workspaces/documents remain. This repairs the isolated QA fixture only; Production was not changed. The bucket and four policy definitions are now included conditionally in the canonical `supabase/migrations/20261017000004_bethag_baseline_security.sql`: they run when the Supabase-managed `storage` schema exists and are skipped by the isolated PGlite parser test. This preserves the frozen 17-file incremental migration inventory. The same SQL was applied idempotently to QA; verification confirmed one private 100 MiB bucket, all four policies, and QA Security Advisor `lints: []`. The follow-up CI run exposed the inventory guard immediately; the standalone incremental file was removed rather than silently changing the frozen cutover sequence.
## 3. Role-based application smoke tests

### Isolated QA SQL/RLS execution — 2026-10-27

Executed a transaction-scoped synthetic role-isolation check directly against isolated Supabase QA branch `bethag-continuity-qa` (`srkucrdcoswlozifvztr`). The SQL ran as PostgreSQL `authenticated` with synthetic JWT claims and was rolled back. A follow-up query confirmed zero synthetic workspaces, condominiums, documents, and installments remained.

- **Collaborator permission boundary — PASS (SQL/RLS subset):** collaborator granted only `documenti` could read the permitted synthetic document, could not read the accounting installment, and an attempted installment update affected zero rows.
- **Resident portal boundary — PASS (SQL/RLS subset):** resident could read the linked active condominium and its shared document; could not read a second condominium, a private document, a foreign condominium's shared document, accounting installments, or workspace membership rows.
- **Rollback/cleanup — PASS:** all fixture row counts returned to zero after the transaction.
- **Limit:** this is live QA database/RLS evidence, not browser end-to-end evidence. It does not mark APP-02, APP-03, APP-06, or APP-13 fully complete; those IDs remain NOT RUN for the required real-authenticated browser flows and document storage checks.



For every row, record PASS/FAIL, UTC timestamp, test account role, sanitized evidence link, and issue ID if failed. Use synthetic QA data only.

| ID | Area | Test | Expected result | Status |
|---|---|---|---|---|
| APP-01 | Authentication | Sign in as administrator; refresh and reopen the workspace | Session persists; correct workspace loads without console/API errors | NOT RUN |
| APP-02 | Authentication | Sign in as collaborator | Only assigned workspace/modules and permitted actions are available | NOT RUN |
| APP-03 | Authentication/RLS | Sign in as resident | Only own linked condominium/unit/portal content is visible; no administrator-only actions | NOT RUN |
| APP-04 | Isolation | Attempt to read or mutate another workspace's known synthetic record | Denied or returns no data; no cross-workspace leakage | NOT RUN |
| APP-05 | Condominium | Create/edit a synthetic condominium and hierarchical unit structure | Saved data persists after reload; hierarchy and relationships remain consistent | NOT RUN |
| APP-06 | Accounting | Create a synthetic expense/allocation and installments | Amounts and allocations are consistent; unauthorized roles cannot mutate accounting | NOT RUN |
| APP-07 | Accounting guard | Attempt to alter a closed accounting period | Operation is rejected and no partial writes remain | NOT RUN |
| APP-08 | Member transfer | Preview and close a valid transfer with one or more incoming co-owners | New owners remain current; outgoing owner is archived only after valid closure; portal links are correct | NOT RUN |
| APP-09 | Member transfer guard | Attempt close with open accounting positions or unresolved carryovers | Closure is rejected; no partial changes; original owner and accounting state remain intact | NOT RUN |
| APP-10 | Member transfer authorization | Attempt close as unauthenticated and as an authenticated user outside the workspace | Denied; no side effects | NOT RUN |
| APP-11 | Rollback | Force a controlled failure in QA during closure transaction | Entire transaction rolls back; no half-archived member, portal, or accounting state | NOT RUN |
| APP-12 | Portal | Post portal content and separately exercise email/communication flow | Portal content and email delivery are distinct; recipient/visibility rules hold | NOT RUN |
| APP-13 | Documents | Upload/read a synthetic document using each permitted role | Storage access matches workspace and role policy | NOT RUN |
| APP-14 | Migration/ACL | Re-run read-only ACL checks after candidate migration rehearsal | No app-role MAINTAIN; only intended PUBLIC EXECUTE exceptions remain | NOT RUN |
| APP-15 | Regression | Refresh page, sign out/in, navigate core dashboard modules | No uncaught browser errors; data persists and navigation works | NOT RUN |

## 3. Evidence to attach

- CI run URL and commit SHA.
- Isolated target project ref, restore source, and test data seed/version.
- Sanitized screenshots or request/response summaries; never attach access tokens, service-role keys, passwords, or resident personal data.
- Results for APP-01 through APP-15, including failures and retest results.
- Before/after counts for synthetic transfer, portal and accounting records, proving rollback where applicable.

## 4. Cutover approval — must be completed by the named approver

- Approver name/role: **NOT RECORDED**
- Approved commit SHA: **NOT RECORDED**
- Exact ordered migration list/hash: **NOT APPROVED**
- Maintenance window and communication plan: **NOT APPROVED**
- Rollback triggers and responsible operator: **NOT APPROVED**
- Backup restore gate: **ACCEPTED AS SATISFIED BY EXPLICIT USER DECISION (2026-10-27)** on the basis of the verified local Docker/PostgreSQL logical restore and the decision not to incur the additional Supabase project cost. Provider-backed physical restore was not performed; residual risk is explicitly accepted for this cutover.
- Final decision: **NO-GO until test evidence and written approval are recorded.**

A green build, QA ACL result, or local logical-dump restore does not by itself authorize Production cutover.
