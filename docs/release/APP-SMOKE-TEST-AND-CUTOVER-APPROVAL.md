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
- **QA Security Advisor — PASS:** latest security advisor query on `bethag-continuity-qa` (`srkucrdcoswlozifvztr`) returned `lints: []`. This is QA-only evidence and does not clear Production's finding.

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

## QA evidence update — 2026-10-28

- Latest verified QA preview CI run: [40617715446](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40617715446), commit `f3e6e8990f0d6d7d96450f57b37ae51a038df249` — **PASS**. The `qa-preview` job completed all steps: QA-only configuration validation, dependency installation, application build, isolated Chromium public-interface smoke test, and QA build artifact upload. Artifact: `bethag-qa-preview-f3e6e8990f0d6d7d96450f57b37ae51a038df249` (expires 2026-11-04). This workflow does not deploy to public Pages and does not exercise real Supabase sign-in.
- Latest verified database/migration CI run: [40616310237](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40616310237), commit `224b43e62c468d92b99650bcc5baf92a5c996697`. Both `build` and `postgres-bootstrap` jobs completed successfully. This includes migration-history reconciliation, Production function-security/ACL parity checks, fresh PostgreSQL 17 bootstrap, all 12 reviewed incremental migrations after the five-file baseline, guarded ledger rehearsal, build, and isolated public-interface browser smoke.
- QA Security Advisor for `srkucrdcoswlozifvztr`: `lints: []` after enabling leaked-password protection in the QA Auth settings. This result applies only to QA; it does not clear Production findings.
- QA role fixture integrity rechecked: exactly three active workspace memberships, one each for `admin`, `collaborator`, and `resident`; all three profile IDs match their membership user IDs. The resident portal fixture is active and consistently linked to the resident profile, condominium-member row, active test condominium, and unit.
- The resident/collaborator `public.get_my_workspace_access()` lookup returned the expected workspace and role-specific permissions in QA checks. The administrator membership and role were independently verified in the fixture. These are database-level checks, not a substitute for signing in through the browser as each account.
- The three fixture emails use `example.com` and have not completed a real sign-in. Real authenticated browser tests APP-01–APP-15 therefore remain NOT RUN unless separately evidenced. Do not mark role-based browser acceptance as passed from mocked auth or SQL fixture checks alone.
- Production was not modified. No Production migration was applied. Cutover remains NO-GO pending remaining application evidence and written approval.

## QA Pages deployment evidence — 2026-10-28

- Temporary public QA preview deployment: [GitHub Actions run 40622567956](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40622567956) — **PASS**, commit `402924875cb6bd2781e5b2d7f9243a383ae8013a`.
- Matching QA build and isolated Chromium public-interface smoke test: [GitHub Actions run 40622567838](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40622567838) — **PASS**, same commit.
- Temporary preview URL recorded by the successful Pages deployment: https://federico1bartolucci-ctrl.github.io/BETHAG/
- The deploy workflow is restricted to `qa/preview-environment-20261028` and validates the exact QA Supabase project ref `srkucrdcoswlozifvztr`. Production was not modified.
- Scope limitation: the external URL was not independently verified by the web inspection tool, and the Chromium smoke test uses mocked auth. Real authenticated browser tests APP-01–APP-15 remain **NOT RUN**. Public Pages must contain synthetic data only. Production cutover remains **NO-GO** pending test evidence and written approval.

## Real-auth QA smoke evidence — 2026-10-28 (latest)

- **PASS:** [QA Pages run 40635572113](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40635572113), commit `f2bde88fabe1d451a2b6b59edcb836b1a9d677be`. The real authenticated role smoke step completed successfully with fail-closed secret validation enabled. The script signs in as administrator, collaborator, and resident against the QA preview, checks each role's expected landing page, refresh/session persistence, and uncaught browser errors both before and after refresh. A successful workflow now proves all three required password secrets were present and the script did not skip the test.
- Matching isolated preview build and mocked public-interface browser smoke: [run 40635572099](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40635572099) — **PASS**, same commit.
- Scope: this is real-auth smoke evidence for role sign-in, landing, refresh, and browser exceptions only. It does **not** prove full APP-01–APP-15 workflows, workspace isolation across two real accounts, accounting, transfer, email delivery, or document upload. Those acceptance rows remain NOT RUN until their dedicated evidence is recorded. Production was not modified.


## Real-auth QA smoke evidence — 2026-10-28 (latest rerun)

- **PASS:** [QA Pages run 40636197889](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40636197889), commit `b48be339c61f0d467c0a72d7a07243bf26c8f030`. The workflow validated all three required password secrets and ran real Supabase sign-in for administrator, collaborator, and resident; each role reached its expected landing page, retained its session after refresh, and produced no uncaught browser errors before or after refresh. Administrator and collaborator also navigated through `Registro e sicurezza` and `Homepage`. The navigation smoke intentionally avoids paid modules blocked by the QA Free plan; that plan gate is not treated as an application defect.
- Matching isolated QA preview build and mocked public-interface smoke: [run 40636197953](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40636197953) — **PASS**, same commit.
- Scope remains limited to authentication, role landing, refresh/session persistence, core available navigation, and browser exceptions. It does **not** complete APP-01–APP-15, prove cross-workspace isolation across real accounts, or exercise accounting, member transfer, email delivery, or document upload. Those acceptance rows remain **NOT RUN** until dedicated evidence is recorded. Production was not modified; cutover remains **NO-GO**.


## QA ACL read-only recheck — 2026-10-28

- **PASS (QA only):** a fresh read-only query against Supabase project `srkucrdcoswlozifvztr` returned zero `MAINTAIN` grants on public tables for `anon`, `authenticated`, and `service_role`.
- **PASS (QA only):** a fresh read-only query of public-schema default ACLs returned zero `MAINTAIN` entries for `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- These checks support the QA privilege posture only. They do not establish Production parity or approve any Production migration; Production remains untouched and cutover remains **NO-GO**.


## PostgreSQL 17 migration/ACL regression — 2026-10-28

- **PASS:** [QA workflow run 40638823674](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40638823674), commit `3460a0012be6cd64717549726c00fc05a3b4ecdd`. Both `qa-preview` and `postgres-bootstrap` jobs completed successfully.
- The QA preview job passed QA-only configuration validation, dependency installation, application build, isolated Chromium public-interface smoke, and build-artifact upload.
- The isolated PostgreSQL 17 job passed baseline bootstrap, guarded execution of the canonical migration runner, incremental hardening catalog/ACL postconditions, and canonical-ledger transaction rehearsal. The job used an ephemeral local PostgreSQL service; it did not connect to or modify Supabase QA or Production.
- This is migration/ACL regression evidence on the current QA branch commit, not a substitute for the remaining real-authenticated application acceptance rows APP-01–APP-15. Those rows remain NOT RUN until individually evidenced. Production was not modified; cutover remains **NO-GO**.
