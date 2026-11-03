# BETHAG — Application smoke-test and cutover approval record

**Status:** DEPLOYED TO GITHUB PAGES — PUBLIC LAUNCH NO-GO PENDING REMAINING ACCEPTANCE EVIDENCE AND FORMAL CUTOVER APPROVAL  
**Scope:** Run against an isolated test environment only. Do not use Production for negative tests or test data mutations.

## 1. Environment and build evidence

- [x] Exact deployed commit: `aabc3cd7393b7d5fff7023e82d9bc702e79a7d74`; build run [41470120008](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41470120008) PASS; GitHub Pages deployment [41470120004](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41470120004) PASS.
- [x] Restore gate disposition (decision recorded 2026-10-27): local Docker/PostgreSQL logical restore was completed and verified; per the user's explicit decision, treat the backup-restore prerequisite as SATISFIED for this cutover without paying for a new Supabase project. Provider-backed physical restore was not performed; its residual risk is accepted for this release and must not be misrepresented as a physical-restore test.
- [x] Production schema/ACL/function postconditions and default-privilege evidence recorded in section 12; RLS/application acceptance remains subject to the per-test status table.
- [x] Latest PR CI validation: [run 40633972708](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40633972708), commit `5b3ca4710da084b2a96d46e7dc3f65cb1e5a71bd` — **PASS** (`build` and `postgres-bootstrap`). This is repository/isolated PostgreSQL validation, not production deployment or full APP-01–APP-15 browser acceptance.
- [x] Production Security Advisor rechecked after migration 20261102151610: `lints: []`; the public transfer wrapper is SECURITY INVOKER.

## 2. Automated public-interface smoke test (partial coverage)

- CI workflow: [run 40496475638](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40496475638), commit `6baf951dfeeee5dcadc50a26ebab9f2dffba155f` — **PASS** (build, browser smoke, PostgreSQL 17 bootstrap, all 11 canonical migrations, ACL postconditions and guarded ledger rehearsal).
- Added `scripts/test-browser-public-smoke.mjs`, run in CI after the production build using a local Vite preview and headless Chromium.
- Added a disposable PostgreSQL RLS regression in `scripts/test-postgres-bootstrap.mjs`: as `authenticated`, a workspace administrator can read its own synthetic condominium but cannot read or update another workspace's row; all fixtures are rolled back. CI run [40499943587](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40499943587) passed the `postgres-bootstrap` job with this regression. This is isolated SQL-level evidence, not a substitute for authenticated browser APP-01–APP-15.
- Automated checks cover the public landing page, opening the login panel, rendering the administrator/collaborator/resident role selectors, rejecting an empty login with validation feedback, rejecting missing and expired recovery links, accepting a valid legacy hash-based recovery link, rejecting mismatched recovery passwords before `updateUser` can run, and completing the success UI path with exactly one mocked `updateUser` and local `signOut` call. The recovery-flow tests use synthetic sessions and mocked Supabase calls; no real account is modified.
- This is intentionally only a public-interface smoke test. It does not authenticate against Supabase or prove real role authorization, resident data isolation, accounting flows, document storage, or member-transfer behavior. APP-01–APP-15 remain NOT RUN until the remaining isolated role-based tests have evidence.
- Supabase QA environment discovery (2026-10-27): existing branches `bethag-continuity-qa` (`srkucrdcoswlozifvztr`), `bethag-develop` (`wvokvcfglduxmjxlnfeh`), `bethag-member-transfer-qa` (`gcorwfvnslnehcxmtixn`) and `bethag-migration-reconciliation-qa` (`mxhciszzpqzvsaqcnwhg`) are active but report `with_data=false`; public table row counts are zero. Their migration ledgers also contain environment-generated version/name histories that differ from the frozen canonical 11-migration sequence. They are not evidence of completed APP-01–APP-15, and none should be treated as the production cutover target.

- **Closed accounting period guard — PASS (live QA SQL subset, 2026-10-27):** in a rolled-back synthetic transaction, attempted updates to both a ledger entry and an installment in a closed fiscal year were rejected by the database trigger; both amounts remained unchanged. Follow-up queries confirmed zero synthetic workspaces, condominiums, fiscal years, ledger entries, or installments remained. This is database guard evidence only; APP-07 browser workflow remains NOT RUN.
- **QA Security Advisor — current PASS (2026-10-28, rechecked):** a fresh call to the Supabase Security Advisor for `bethag-continuity-qa` (`srkucrdcoswlozifvztr`) now returns `lints: []`, so the earlier `auth_leaked_password_protection` warning is no longer present in the latest advisor response. This confirms the current advisor output for this QA project only; it does not establish Production's advisor state or prove every Auth setting independently.

- **QA PUBLIC EXECUTE review — PASS (2026-10-28):** read-only catalog inspection found exactly two routines executable by `PUBLIC`: `public.normalize_zero_ownership_owner()` and `public.preserve_closing_condominium_member_history()`. Both are ordinary `SECURITY INVOKER` functions intended as trigger helpers; no other public/private routine was found with `PUBLIC` EXECUTE. This verifies the QA branch only; Production ACLs still require their own evidence after the approved migration rehearsal.

- **Role-based application end-to-end readiness — BLOCKED (2026-10-28):** the existing QA Auth users were previously observed with resident profiles, while `workspace_members` and `portal_access` contained zero rows and no condominiums existed in that QA data snapshot. Do not repurpose accounts or elevate roles via direct SQL. This is a data-fixture/authorization gate, not a statement that the login screen cannot authenticate.

- **Real-auth login/landing smoke — PASS (2026-10-28, separate QA Pages deployment):** [workflow run 40629723826](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40629723826), commit `5d88107390c155ade1fc8fac11d54449305a716f`, passed Supabase sign-in, role-specific landing, refresh/session persistence, and uncaught-browser-error checks for the configured Administrator, Collaborator, and Condomino test profiles. This proves the narrow login/session smoke path only; it does **not** prove workspace membership/RLS isolation, condominium fixtures, accounting workflows, document access, or subentro. APP-01–APP-15 remain NOT RUN until their full acceptance criteria have evidence.

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
| APP-01 | Authentication | Sign in as administrator; refresh and reopen the workspace | Session persists; correct workspace loads without console/API errors | PASS — real-auth browser run 41459214926 |
| APP-02 | Authentication | Sign in as collaborator | Only assigned workspace/modules and permitted actions are available | PASS — real-auth browser run 41459214926; role restrictions verified |
| APP-03 | Authentication/RLS | Sign in as resident | Only own linked condominium/unit/portal content is visible; no administrator-only actions | PASS — real-auth browser run 41459214926; resident role/navigation restrictions verified |
| APP-04 | Isolation | Attempt to read or mutate another workspace's known synthetic record | Denied or returns no data; no cross-workspace leakage | PARTIAL — authenticated QA RLS workflow 41383673779 verified foreign-workspace denial for collaborator; full matrix not covered |
| APP-05 | Condominium | Create/edit a synthetic condominium and hierarchical unit structure | Saved data persists after reload; hierarchy and relationships remain consistent | PARTIAL — browser workflow 41459214926 verified create/edit/archive/restore; full hierarchical-unit matrix not separately evidenced |
| APP-06 | Accounting | Create a synthetic expense/allocation and installments | Amounts and allocations are consistent; unauthorized roles cannot mutate accounting | PASS — browser workflow 41459214926 verified expenses, 1,000-millesimi allocation and installments; collaborator restrictions included |
| APP-07 | Accounting guard | Attempt to alter a closed accounting period | Operation is rejected and no partial writes remain | PARTIAL — QA database guard and authenticated workflow 41384266665 passed; full browser guard scenario not evidenced |
| APP-08 | Member transfer | Preview and close a valid transfer with one or more incoming co-owners | New owners remain current; outgoing owner is archived only after valid closure; portal links are correct | PARTIAL — browser workflow 41459214926 verified preview/confirmation/closure and owner refresh; multi-incoming co-owner and portal-link matrix not separately evidenced |
| APP-09 | Member transfer guard | Attempt close with open accounting positions or unresolved carryovers | Closure is rejected; no partial changes; original owner and accounting state remain intact | PARTIAL — authenticated QA transfer workflow 41384782912 rejected unpaid €90 installment without state change; full browser scenario not evidenced |
| APP-10 | Member transfer authorization | Attempt close as unauthenticated and as an authenticated user outside the workspace | Denied; no side effects | PARTIAL — Production negative test returned AUTH_REQUIRED; QA resident denied; outside-workspace transfer case not yet evidenced in latest browser suite |
| APP-11 | Rollback | Force a controlled failure in QA during closure transaction | Entire transaction rolls back; no half-archived member, portal, or accounting state | PARTIAL — valid closure atomicity and blocked-closure state preservation verified; forced mid-transaction failure injection remains outstanding |
| APP-12 | Portal | Post portal content and separately exercise email/communication flow | Portal content and email delivery are distinct; recipient/visibility rules hold | PARTIAL — publication/visibility workflow 41384610747 PASS; controlled Production email test delivered to the authorized test recipient and Resend webhook synchronized email.delivered to recipient delivered and communication Consegnata (2026-11-03); full recipient/visibility matrix and end-to-end browser acceptance remain outstanding |
| APP-13 | Documents | Upload/read a synthetic document using each permitted role | Storage access matches workspace and role policy | PASS — authenticated QA workflow 41383673779 verified real byte upload by collaborator and download by authorized resident; cleanup confirmed |
| APP-14 | Migration/ACL | Re-run read-only ACL checks after candidate migration rehearsal | No app-role MAINTAIN; only intended PUBLIC EXECUTE exceptions remain | PASS — Production forward migration 20261102151610 applied; live ACL/default-ACL/function postconditions and Security Advisor verified |
| APP-15 | Regression | Refresh page, sign out/in, navigate core dashboard modules | No uncaught browser errors; data persists and navigation works | PASS — authenticated QA browser run 41459214926 passed real sign-in/refresh for all three roles, 12 admin destinations, role restrictions and core UI workflows |

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

## 5. Additional isolated QA database evidence — 2026-10-28 08:26 UTC

**Target:** Supabase QA branch `bethag-continuity-qa` (`srkucrdcoswlozifvztr`). Production was not queried for test mutations and was not modified. Synthetic fixture marker: `APP-01-15-20261028`.

### Seeded synthetic fixtures

- 1 new test condominium in the existing QA workspace and 1 separate foreign-workspace condominium.
- 2 units, 5 synthetic condominium-member records, 2 fiscal years (one open and one closed), 2 ledger entries, 1 expense allocation, 1 unpaid installment, 1 document metadata row, 1 published communication, 1 pending communication recipient, and 3 draft transfer records.
- Storage-object visibility was tested with temporary metadata rows inside a transaction; the transaction rolled back and no test storage-object rows remain.
- No email was sent. The communication recipient remains `pending`; this is not proof of provider delivery.
- The synthetic fixture remains in the QA database for a possible authenticated-browser run. Remove it after final browser acceptance using the marker above and dependency-safe cleanup; do not remove unrelated QA records.

### Transactional SQL/RLS checks — PASS for the stated database subset

- **APP-01 subset:** simulated authenticated administrator identity retains the expected accounting-module permission. Real sign-in/session persistence is covered only by the separate earlier real-auth smoke run noted above.
- **APP-02 subset:** collaborator with `documenti=true` and `contabilita=false` is allowed document management and denied accounting access; unauthorized ledger reads return no rows.
- **APP-03 subset:** linked resident can see the linked active condominium and the shared document metadata, but cannot read accounting ledger entries.
- **APP-04 subset:** administrator cannot see the foreign-workspace condominium through RLS.
- **APP-05 subset:** administrator created a synthetic condominium and unit, edited the condominium, and re-read the hierarchy successfully inside a transaction; temporary CRUD rows were rolled back.
- **APP-06 subset:** synthetic expense allocation totals reconcile to the ledger amount (120.00); collaborator accounting access is denied.
- **APP-07 subset:** an attempted update to a ledger entry in a closed fiscal year was rejected; the amount remained unchanged.
- **APP-08 subset:** valid transfer closure returned success, archived the outgoing owner and retained the incoming owner as active. The enclosing transaction was rolled back for test isolation.
- **APP-09 subset:** transfer closure with an unpaid installment raised `TRANSFER_FINANCIAL_POSITIONS_OPEN`; transfer state and outgoing-member active state remained unchanged.
- **APP-10 subset:** closure attempts without an authenticated user, as a resident, and as a collaborator without condominium-management permission were rejected (`AUTH_REQUIRED` / `FORBIDDEN`).
- **APP-11 subset:** after the successful-closure transaction was rolled back, the transfer remained in its original draft state and both members retained their pre-test active state. Temporary storage metadata also returned to zero.
- **APP-12 subset:** resident can read the published portal communication and own pending-recipient record. Actual email provider delivery was not attempted and remains untested.
- **APP-13 subset:** resident can read shared document metadata and a synthetic shared storage-object row, but cannot read a foreign-workspace object. Storage-object rows were transaction-scoped and rolled back. No real file bytes were uploaded/downloaded; full upload/download acceptance remains untested.
- **APP-14 subset:** latest QA catalog query found 47 public tables, zero `MAINTAIN` grants to `authenticated` or `service_role` on those tables, zero app-role `MAINTAIN` defaults, and exactly the two intended `PUBLIC EXECUTE` trigger exceptions: `public.normalize_zero_ownership_owner()` and `public.preserve_closing_condominium_member_history()`.
- **APP-15 subset:** latest CI run [40655615758](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40655615758), commit `8e02d92f5aff36794a82b40980f3580d7071a511`, passed `build` (including public browser smoke) and `postgres-bootstrap` (isolated PostgreSQL migration/ACL/RLS tests). It does not test authenticated navigation, refresh, sign-out/sign-in, or persisted UI state.

**Important acceptance boundary:** these results are SQL/RLS and CI subsets only. The APP-01–APP-15 table above intentionally remains **NOT RUN** for the full authenticated browser acceptance scenarios. Do not mark the 15 application tests PASS until real role-specific browser flows, actual file upload/download, and email-delivery behavior have been exercised and evidence recorded.

## 6. Follow-up permission regression found and isolated QA correction — 2026-10-28

A stricter collaborator regression uncovered a second half of the same defect: `private.can_access_workspace_module(uuid,text)` checked JSON key presence, so a permission such as `{"condomini": false}` denied writes through the corrected `can_manage_workspace_module` but still allowed module reads through RLS.

- **QA-only correction applied:** `private.can_access_workspace_module` now checks the actual JSON boolean when permissions are an object, and supports legacy array-shaped permission lists. No Production SQL was run.
- **Retest — PASS (isolated QA SQL/RLS):** for the collaborator fixture, `documenti=true` grants read and write access; `condomini=false` and `contabilita=false` deny module access; RLS no longer returns the synthetic condominium to that collaborator. Administrator and linked-resident visibility checks, accounting allocation reconciliation, closed-period guard, published communication and shared-document metadata checks also passed in the same rolled-back transaction.
- **Canonical migration updated:** `20261028100000_fix_collaborator_module_permission_boolean.sql` now defines both `can_manage_workspace_module` and `can_access_workspace_module`; the frozen manifest entry was reconciled to the updated Git blob SHA. The updated candidate is committed as `4aaadbe7a0dab5c0ba9158e871d3e229879751b1`; manifest reconciliation is committed as `8215c7fad9e3e96513a7c8b02f069ddacbffdb40`.
- **CI status — NOT YET VERIFIED on the updated migration:** the isolated QA function was corrected directly and its SQL/RLS assertions passed, but the updated migration has not yet been demonstrated by a new green CI run. The full authenticated-browser APP-01–APP-15 scenarios remain NOT RUN. This is a release blocker, not a PASS.


## 7. Current isolated QA real-auth evidence — 2026-11-02

**Target:** approved QA project `jhuyhlzzydcgghrzeexn`; no Production mutations. **Commit:** `8aa3b17fba51ed304f8bd4e977c9cf1eb1c0d850`.

- Provisioning workflow [41383220054](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41383220054) — PASS. Three dedicated Auth users, three active workspace memberships, one synthetic condominium, one unit, one linked resident member, and one active portal-access row were verified in QA.
- Real authenticated browser smoke [41383220012](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41383220012) — PASS for administrator, collaborator, and resident. Each account completed Supabase Auth sign-in, role-specific landing, refresh/session persistence, and no uncaught browser page errors.
- QA Security Advisor — `lints: []` on 2026-11-02. Performance Advisor reports unused indexes on an effectively empty QA dataset and 21 multiple-permissive-policy notices; these are performance findings, not Security Advisor findings. No indexes or policies were removed as part of this check.
- This evidence closes only the narrow real-authentication/session smoke. It does **not** complete APP-01–APP-15: workspace/module restrictions, cross-workspace denial, create/edit persistence, accounting UI, browser transfer closure/rollback, portal communications, email provider delivery, actual file-byte upload/download, and post-migration ACL acceptance still require dedicated scenarios. Keep the official APP-01–APP-15 statuses NOT RUN until each full acceptance criterion is exercised and recorded.

## 8. Authenticated QA RLS and Storage acceptance — 2026-11-02

- Workflow [run 41383673779](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41383673779), commit `a330d4ef19f2178d038bfa8f09afbe638af52483` — **PASS**. The test used real Supabase Auth sessions for the three dedicated QA accounts against project `jhuyhlzzydcgghrzeexn`; it did not use the service-role key for authorization assertions.
- **APP-01 partial — PASS:** authenticated administrator read of the fixture condominium in its own workspace.
- **APP-02 partial — PASS:** collaborator could read the permitted condominium; accounting rows were not visible and an attempted accounting-entry insert was rejected by RLS.
- **APP-03 partial — PASS:** resident could read their own portal access and linked condominium; accounting rows were not visible and document creation was rejected.
- **APP-04 partial — PASS:** collaborator received no rows for a foreign workspace and a write targeting a foreign workspace was rejected.
- **APP-13 partial — PASS:** collaborator uploaded synthetic document bytes and created matching document metadata; resident downloaded the bytes only after the document was shared. The test removed both metadata and object in cleanup.
- **Fixture cleanup — PASS:** the test confirmed no test-marked ledger entries and removed its temporary document metadata and Storage object.
- These are authenticated API/RLS/Storage tests, not complete browser acceptance. They do not validate UI workflows, accounting allocation/installments, period closure, subentro, outbound email delivery, or all remaining APP scenarios. The APP-01–APP-15 checklist remains NOT RUN until each full acceptance criterion is evidenced. No production calls, migration, merge, or cutover were performed.

## 9. Authenticated condominium/accounting QA acceptance — 2026-11-02

- Workflow [run 41384266665](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41384266665), commit `7e6b208eab0e20e3495fa057e971bb8c05a7022c` — **PASS** on the approved isolated QA project. Tests used the real administrator and collaborator Auth sessions; service-role credentials were used only for cleanup.
- **APP-05 partial — PASS:** administrator created a synthetic condominium and unit, updated the condominium address, and reread both records to verify persistence.
- **APP-06 partial — PASS:** administrator created an open fiscal year, a €125.50 expense, a 1,000-millesimi allocation, and a €125.50 installment; the official payment RPC registered the payment and reconciled the installment to `Pagato`.
- **Accounting authorization boundary — PASS:** collaborator's attempt to invoke the payment RPC was rejected by the function's internal `can_manage_workspace_module(..., 'contabilita')` check.
- **APP-07 partial — PASS:** the official fiscal-year closure RPC closed the test year; a subsequent ledger mutation was rejected and the original €125.50 amount remained unchanged.
- **Defect found and repaired in QA:** public invoker wrappers for seven accounting RPC implementations were executable by `authenticated`, but their private SECURITY DEFINER implementations were executable only by `service_role`. The browser payment/closure flows therefore failed with a permission error. Applied QA-only migration artifact `supabase/rebuild/qa-only-migrations/20261102100000_repair_authenticated_accounting_rpc_private_execute.sql`, granting EXECUTE only to `authenticated` on those seven private routines. It is deliberately outside `supabase/migrations` and is not part of the frozen Production migration inventory. Each routine enforces authentication and the accounting-module permission internally. Verified post-migration: authenticated EXECUTE = true, PUBLIC EXECUTE = false for all seven routines; Security Advisor returned `lints: []`.
- **Cleanup — PASS:** the synthetic condominium, unit, fiscal year, ledger entry, allocation, installment, and payment movement were removed after the test; a follow-up count returned zero for every marker table.
- **Release-plan impact:** this is a post-freeze follow-up migration applied only to QA. The original frozen 17-migration cutover inventory is now incomplete for any future release candidate and must not be used unchanged. Production remains untouched; no merge, deployment, or cutover was performed.
- This is authenticated API/database evidence, not full browser acceptance. APP-01–APP-15 remain NOT RUN in the formal checklist until all complete acceptance criteria, including the remaining UI and workflow scenarios, are evidenced.

## 10. Authenticated communication publication QA acceptance — 2026-11-02

- Workflow [run 41384610747](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41384610747), commit `81811978a6d04fcbc1c1efaa0d949744149ec805` — **PASS** against the approved QA project using real administrator and resident Auth sessions.
- **APP-12 partial — PASS:** administrator created a draft communication; resident could not read it; after publication the resident could read it; after unpublishing the resident lost visibility again. The synthetic communication was deleted after the test.
- The QA resident fixture now includes the `comunicazioni` portal permission. This is test-fixture configuration only.
- **Email provider delivery remains NOT TESTED:** no email was sent and no delivery provider was invoked. This evidence covers only in-portal publication visibility, not outbound email delivery or recipient delivery records.
- Full APP-12 remains NOT RUN in the formal checklist until its complete acceptance criteria are met.

## 11. Authenticated ownership-transfer QA acceptance — 2026-11-02

- Workflow [run 41384782912](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41384782912), commit `bd2473f808101b9595e007209a0024801ed69a7f` — **PASS** against the approved QA project. Administrator and resident used real Auth sessions; service-role credentials were used only for fixture cleanup.
- **APP-08 partial — PASS:** the administrator previewed and confirmed a whole-property transfer through the official RPC. The outgoing owner remained active but was marked `In chiusura`; after closure the outgoing owner was archived and the transfer status became `Chiuso`.
- **APP-09 partial — PASS:** a synthetic unpaid €90 installment prevented closure. The transfer remained `Confermato` and the outgoing member remained active/in closure.
- **APP-10 partial — PASS:** the resident role was denied transfer confirmation/closure operations. Full outside-workspace negative coverage remains outstanding.
- **APP-11 partial — PASS:** the official closure RPC completed atomically for a valid transfer; the separate blocked-closure case preserved the transfer and outgoing-owner state. A forced mid-transaction failure/rollback injection was not performed.
- **Fixture cleanup — PASS:** transfer, synthetic members, unit, and condominium fixtures were removed.
- These are authenticated RPC/database tests, not full browser UI acceptance. APP-08–APP-11 remain partial; the complete APP-01–APP-15 formal checklist remains NOT RUN.


## 12. Production ACL and member-transfer RPC alignment — 2026-11-02 15:16 UTC

**Production project:** `tctcgptrsmvgajqjgnev`. A forward-only migration was applied after QA transaction simulation and a successful GitHub Actions build. No business rows or historical migration rows were rewritten.

- Migration: `20261102151610_harden_live_production_acl_and_transfer_invoker`.
- Source: `supabase/migrations/20261102151610_harden_live_production_acl_and_transfer_invoker.sql`.
- PR [#37](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/37) merged by squash; merge commit `5a9c4f934905857087d1e8e598ecad018abc31fe`.
- Pre-migration evidence showed 34 relation-level MAINTAIN grants to authenticated, 48 to service_role, broad public-schema default MAINTAIN, missing service_role private-schema USAGE/EXECUTE, and a SECURITY DEFINER public transfer wrapper.
- Post-migration live catalog evidence:
  - `anon`, `authenticated`, `service_role`: **0 MAINTAIN** on public relations.
  - Application default ACL: **0 MAINTAIN** grants for those roles.
  - `service_role` private-schema USAGE: **true**.
  - Public transfer wrapper SECURITY DEFINER: **false** (SECURITY INVOKER).
  - Private implementation EXECUTE: authenticated=true, service_role=true, anon=false.
- Supabase Security Advisor: `lints: []`.
- A transaction-scoped authenticated-role negative test invoked the public wrapper without a user identity and received the expected `AUTH_REQUIRED`; transaction rolled back without business-data changes.
- The exact migration version returned by Supabase was recorded in the Git repository filename; Production ledger now contains 245 entries, with the new migration as the final entry. Existing 244 history rows were preserved.
- The exact SQL sequence was also simulated on QA after temporarily recreating the observed Production grants; all postcondition assertions passed and the transaction was rolled back. QA state was rechecked unchanged.

**APP-14 Production alignment: PASS.** APP-15 remains PASS for the documented authenticated browser scope in run [41459214926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41459214926).

**Release boundary:** this closes the live ACL/function discrepancy, not the entire launch. APP-12 outbound email provider delivery is now verified for one controlled Production recipient; full recipient/visibility matrix and remaining application acceptance records must still be completed before declaring BETHAG ready for public launch.


## 13. Current release state and deployed build — 2026-11-02 16:18 UTC

- Latest main commit `aabc3cd7393b7d5fff7023e82d9bc702e79a7d74`: **build PASS**, workflow [41470120008](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41470120008).
- GitHub Pages deployment for that exact commit: **PASS**, workflow [41470120004](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41470120004). The deployment job completed its build, upload and Pages deployment steps successfully.
- APP-14 is **PASS in Production** as detailed in section 12. APP-15 is **PASS for the authenticated browser scope documented in run [41459214926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41459214926)**.
- The table above distinguishes full PASS from PARTIAL evidence. Partial rows must not be represented as full acceptance.
- **Outbound email — VERIFIED for one controlled recipient (2026-11-03):** BETHAG UI → bethag-send-email → Resend delivered the test message; provider event email.delivered was replayed to bethag-resend-webhook and persisted in Production. Recipient status is delivered; parent communication status is Consegnata. The test recipient was the authorized account only. The temporary test member was removed; delivery audit and communication record were retained. This does not prove bulk delivery, multi-recipient behavior, bounce/complaint handling, or the complete resident notification matrix.
- **Formal cutover approval remains incomplete:** approver, approved SHA, exact ordered migration list/hash, maintenance window, communications plan, rollback triggers and responsible operator have not been recorded.
- **Decision: NO-GO for public launch** until the remaining application acceptance evidence and formal cutover approval fields are completed. The controlled single-recipient email-delivery test is now recorded in section 14. The website deployment itself is successful; that is not equivalent to launch approval.


## 14. Production email delivery and webhook synchronization — 2026-11-03

- Controlled test performed through the BETHAG Production UI; one authorized test recipient only. The application reported successful delivery and the message was received.
- Resend provider event confirmed email.delivered; the Production webhook is enabled for email.sent, email.delivered, email.bounced, and email.complained.
- The signed webhook event was replayed and processed successfully. Production database evidence confirms recipient status delivered, event type email.delivered, provider event ID retained, and parent communication status Consegnata.
- Temporary test member removed with dependency checks; no unrelated business data changed. Communication and delivery audit retained for traceability.
- PR #45 merged after CI run 41594862260 passed. Merge commit: b0796223f1cb0b33017cc9623a0726135beeea00. The merge versions the already-deployed webhook source and already-applied grant migration; no new Production deployment or migration was run by the merge.
- Live catalog check: the private RPC signature matches the migration; service_role EXECUTE is true, while authenticated and anon EXECUTE are false.
- Acceptance boundary: one controlled email proves the single-recipient send/delivery/status-sync path. It does not complete multi-recipient, bounce/complaint, portal visibility matrix, or all APP-12 acceptance criteria.


## 15. QA workspace isolation and collaborator permission regression — 2026-11-03

**Target:** isolated Supabase QA project `jhuyhlzzydcgghrzeexn`. All fixtures and permission changes were enclosed in explicit transactions and rolled back. Production was not queried or modified.

- **APP-04 additional subset — PASS:** created one synthetic condominium in the authenticated user's own workspace and one in a second synthetic workspace. Under the real PostgreSQL `authenticated` role and administrator JWT claim, own-workspace visibility was 1 and foreign-workspace visibility was 0. Repeated with the collaborator JWT and the legacy array permission `['condomini']`: own visibility was 1 and foreign visibility was 0.
- **Collaborator boolean permission matrix — PASS:** under the authenticated collaborator role, `{"condomini": false}` returned `can_read=false`, `can_write=false`, and zero visible rows; `{"condomini": true}` returned `can_read=true`, `can_write=true`, and one visible row; an absent key (`{}`) returned false/false and zero visible rows. Legacy array-shaped `['condomini']` returned true/true and one visible row.
- The tests exercised `private.can_access_workspace_module` and `private.can_manage_workspace_module` together with the actual `condominiums` RLS policy, not only isolated helper return values.
- **Rollback and preservation — PASS:** after all tests, QA counts remained unchanged: 1 workspace, 63 condominiums, 60 units, 3 workspace memberships, 0 transfers, 14 fiscal years, 14 ledger entries, and 13 installments. No fixture rows or permission edits were retained.
- **Acceptance boundary:** these results strengthen APP-04 and the collaborator permission regression evidence, but do not replace browser-based acceptance or cover every resident/out-of-workspace mutation path. APP-04 remains PARTIAL until the complete role/action matrix is exercised. APP-05, APP-07–APP-12 remain partial as recorded in the table.
