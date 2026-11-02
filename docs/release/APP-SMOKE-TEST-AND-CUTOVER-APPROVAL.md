# BETHAG — Application smoke-test and cutover approval record

**Status:** PREPARED — TEST EXECUTION AND APPROVAL PENDING  
**Scope:** Run against an isolated test environment only. Do not use Production for negative tests or test data mutations.

## 1. Environment and build evidence

- [ ] Record the exact commit SHA and deployment/build artifact.
- [x] Restore gate disposition (decision recorded 2026-10-27): local Docker/PostgreSQL logical restore was completed and verified; per the user's explicit decision, treat the backup-restore prerequisite as SATISFIED for this cutover without paying for a new Supabase project. Provider-backed physical restore was not performed; its residual risk is accepted for this release and must not be misrepresented as a physical-restore test.
- [ ] Confirm schema, RLS, function ACL, owner and default-privilege evidence is attached.
- [x] Latest PR CI validation: [run 40633972708](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40633972708), commit `5b3ca4710da084b2a96d46e7dc3f65cb1e5a71bd` — **PASS** (`build` and `postgres-bootstrap`). This is repository/isolated PostgreSQL validation, not production deployment or full APP-01–APP-15 browser acceptance.
- [ ] Confirm Security Advisor findings are reviewed; Production's current authenticated SECURITY DEFINER RPC warning remains until the approved forward migration changes the RPC to SECURITY INVOKER.

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
| APP-01 | Authentication | Sign in as administrator; refresh and reopen the workspace | Session persists; correct workspace loads without console/API errors | PARTIAL — real Auth, RLS landing and refresh passed; complete module workflow pending |
| APP-02 | Authentication | Sign in as collaborator | Only assigned workspace/modules and permitted actions are available | PARTIAL — real Auth, module/RLS boundary and navigation passed; full UI actions pending |
| APP-03 | Authentication/RLS | Sign in as resident | Only own linked condominium/unit/portal content is visible; no administrator-only actions | PARTIAL — portal scope and role landing passed; complete portal workflow pending |
| APP-04 | Isolation | Attempt to read or mutate another workspace's known synthetic record | Denied or returns no data; no cross-workspace leakage | PASS — authenticated QA read returned no rows and foreign-workspace write was rejected |
| APP-05 | Condominium | Create/edit a synthetic condominium and hierarchical unit structure | Saved data persists after reload; hierarchy and relationships remain consistent | PARTIAL — authenticated API persistence passed; browser form and hierarchy UI pending |
| APP-06 | Accounting | Create a synthetic expense/allocation and installments | Amounts and allocations are consistent; unauthorized roles cannot mutate accounting | PARTIAL — expense, allocation, installment and payment API checks passed; accounting UI pending |
| APP-07 | Accounting guard | Attempt to alter a closed accounting period | Operation is rejected and no partial writes remain | PARTIAL — live QA database guard passed; persistent synthetic closed-year fixture retained |
| APP-08 | Member transfer | Preview and close a valid transfer with one or more incoming co-owners | New owners remain current; outgoing owner is archived only after valid closure; portal links are correct | PARTIAL — authenticated preview/confirm/close RPC passed; browser UI and portal-link workflow pending |
| APP-09 | Member transfer guard | Attempt close with open accounting positions or unresolved carryovers | Closure is rejected; no partial changes; original owner and accounting state remain intact | PARTIAL — unpaid installment blocked closure and preserved owner/transfer/accounting state; additional carryover cases pending |
| APP-10 | Member transfer authorization | Attempt close as unauthenticated and as an authenticated user outside the workspace | Denied; no side effects | PASS — anonymous and cross-workspace callers denied; transfer and owner state unchanged |
| APP-11 | Rollback | Force a controlled failure in QA during closure transaction | Entire transaction rolls back; no half-archived member, portal, or accounting state | PARTIAL — rejected closure left transfer, both owner states and unpaid installment unchanged; full UI rollback pending |
| APP-12 | Portal | Post portal content and separately exercise email/communication flow | Portal content and email delivery are distinct; recipient/visibility rules hold | PARTIAL — publication, recipient prep and queue authorization passed; provider delivery not tested |
| APP-13 | Documents | Upload/read a synthetic document using each permitted role | Storage access matches workspace and role policy | PASS — authenticated collaborator upload and resident shared-file download passed; foreign/private access denied |
| APP-14 | Migration/ACL | Re-run read-only ACL checks after candidate migration rehearsal | No app-role MAINTAIN; only intended PUBLIC EXECUTE exceptions remain | PARTIAL — zero app-role MAINTAIN and clean Security Advisor; default-ACL parity and QA branch status unresolved |
| APP-15 | Regression | Refresh page, sign out/in, navigate core dashboard modules | No uncaught browser errors; data persists and navigation works | PARTIAL — real Auth refresh and 12 admin navigation destinations passed; complete regression/sign-out flow pending |

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

## 11. Authenticated member-transfer QA acceptance — 2026-11-02

- Workflow [run 41384782912](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41384782912), commit `bd2473f808101b9595e007209a0024801ed69a7f` — **PASS** on the approved QA project using real administrator and resident Auth sessions.
- **APP-08 partial — PASS:** transfer preview and confirmation succeeded; the authorized administrator closed a transfer with no open accounting positions.
- **APP-09 partial — PASS:** a €90 unpaid installment prevented transfer closure; transfer status remained `Confermato` and the outgoing member remained active with `In chiusura` status.
- **APP-10/11 partial — PASS:** a resident's attempt to close the transfer was rejected; after authorized closure, the outgoing member became inactive/archived and the incoming owner remained active/current.
- **Cleanup — PASS:** all temporary condominiums, units, members, transfers, and installments were deleted. A follow-up QA query returned zero rows for each test marker.
- Cross-workspace and unauthenticated closure denial remain separate acceptance items; this run does not complete APP-08–APP-11 in the formal checklist. All APP-01–APP-15 checklist entries remain NOT RUN pending full UI acceptance.

## 12. QA database security/ACL evidence — 2026-11-02

- Approved QA project `jhuyhlzzydcgghrzeexn`: 47/47 public base tables have RLS enabled; no public base table without RLS.
- All 48 public relations (47 tables plus one view) are owned by `postgres`.
- `anon`, `authenticated`, and `service_role` have no effective `MAINTAIN` privilege on the checked public application relation. Security Advisor returned `lints: []`.
- No public SECURITY DEFINER function was found with effective PUBLIC EXECUTE in the targeted scan.
- Current effective table grants observed: authenticated SELECT on 48 relations, INSERT/UPDATE/DELETE on a subset; service_role CRUD and operational grants on 48 relations. These broad service-role grants are expected to be constrained by trusted server-side use; they are not a user-session authorization proof.
- Default ACL catalog includes both `postgres` and `supabase_admin` owners. The `postgres/public` defaults are narrowed (authenticated CRUD; service_role CRUD plus REFERENCES/TRIGGER/TRUNCATE; no anon table grants). The `supabase_admin/public` defaults retain broad Supabase-managed ACL entries and have not been changed. Owner-specific default ACL parity against the intended Production release state is still pending.
- **APP-14 partial — PASS:** live RLS coverage, relation ownership, MAINTAIN absence, Security Advisor and targeted PUBLIC SECURITY DEFINER scan verified in QA. Full ACL/default-privilege parity is not certified until owner-specific defaults and every routine ACL are reconciled against the approved release manifest.

## 13. Updated QA acceptance evidence — 2026-11-02 (current)

**Working branch:** ops/qa-secret-validation-20261102. **Latest code/test commit:** f7bd8596c59dc33beff0adb9112209fdc10f13af. All checks below targeted the isolated QA branch bethag-launch-qa (jhuyhlzzydcgghrzeexn). Production was not modified; PR #25 remains draft and unmerged.

- **Build and isolated PostgreSQL — PASS:** [run 41387928919](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387928919), including migration-history verification, security/ACL parity checks, PostgreSQL 17 bootstrap, canonical migration rehearsal, collaborator permission regression, build and public browser smoke.
- **Real-auth browser and role navigation — PASS for the stated scope:** [authenticated smoke 41386792934](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41386792934) and [navigation 41386792949](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41386792949). Administrator, collaborator and resident each signed in with Supabase Auth, landed on the expected role page, retained session after refresh, and produced no uncaught browser errors. Administrator activated all 12 navigation destinations; collaborator/resident staff-navigation restrictions held.
- **APP-04 and APP-13 authenticated RLS/Storage — PASS:** [run 41387258362](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387258362). Foreign-workspace read returned no rows and write was rejected. Collaborator uploaded real synthetic file bytes; resident downloaded the shared file; foreign/private object access was denied. Test object and metadata cleanup passed.
- **APP-05–APP-07 accounting/condominium API subset — PASS:** [run 41387923787](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387923787). Condominium/unit create-edit persisted; €125.50 expense, 1,000-millesimi allocation, installment and payment reconciled; collaborator accounting payment was denied; a closed-year ledger mutation was rejected. Temporary APP-05/06 rows were deleted. One explicit persistent QA-only closed-year fixture is retained for repeatable APP-07 testing.
- **APP-08–APP-11 transfer API/RPC subset — PASS:** [run 41387535794](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387535794). Valid transfer preview/confirmation/closure passed; €90 unpaid installment blocked closure; failed closure preserved transfer, outgoing/incoming owner states and installment values; anonymous and outside-workspace callers were denied. Service-role cleanup completed. A follow-up read-only count confirmed zero remaining transfer test workspaces, condominiums and transfers.
- **APP-12 communication publication and recipient preparation — PASS for the stated scope:** [run 41387814274](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387814274). Draft/publish/unpublish visibility was correct; administrator prepared recipient rows and reset only the authorized queue; resident was denied both operations and recipient rows remained unchanged. No email was sent. Provider delivery, bounce/delivery webhooks and real inbox receipt remain untested.
- **QA-only permission defect repaired:** the communication public invoker RPCs called private implementations without the required authenticated EXECUTE grants. Applied QA-only migration 20261102041805_repair_authenticated_communication_rpc_private_execute; the stale-queue reset implementation now requires an authenticated user, a communication ID, and comunicazioni management permission. The matching SQL artifact is stored at supabase/rebuild/qa-only-migrations/20261102041805_repair_authenticated_communication_rpc_private_execute.sql. Effective grants were checked: anon=false, authenticated=true; Security Advisor returned lints: []. This migration is not part of the frozen Production migration inventory.
- **Live QA ACL subset — PASS, full parity pending:** read-only catalog checks returned zero MAINTAIN privileges for authenticated and service_role on public application tables; no public SECURITY DEFINER function was callable by anon/authenticated in the targeted scan; Security Advisor returned zero lints. Supabase-managed supabase_admin default ACL entries remain broad and were not modified; owner-specific default-privilege parity still needs formal reconciliation.
- **QA branch state — BLOCKER:** Supabase branch listing still reports bethag-launch-qa as MIGRATIONS_FAILED, although its preview database is ACTIVE_HEALTHY, supabase_migrations.schema_migrations contains 35 entries, and latest recorded version is 20261102100000. Branch-creation logs show initial bootstrap errors (missing supabase_migrations.schema_migrations, missing public.portal_access, and a catalog query referencing absent schemaname). The database currently answers authenticated tests, but the branch-level failure status has not been reconciled; do not treat it as a clean migration deployment.
- **Acceptance boundary:** APP-01–APP-15 are not all complete. The table above distinguishes partial API/RLS checks from complete UI acceptance. Remaining work includes browser-level condominium/accounting/subentro/document workflows, actual email provider delivery, complete default-ACL parity, resolution of the QA branch migration status, and formal production migration inventory/cutover approval.

**Final decision remains NO-GO.** No Production SQL, deployment, PR merge, or cutover was performed.

## 13. Consolidated authenticated QA evidence — 2026-11-02 (latest reruns)

**Target:** isolated Supabase QA project `jhuyhlzzydcgghrzeexn`. All runs below used dedicated QA Auth accounts; service-role credentials were restricted to fixture setup/cleanup. No Production migration, deployment, data mutation, or cutover was performed.

| Scenario | Latest evidence | Result and boundary |
|---|---|---|
| APP-01–04 | [Authenticated RLS/storage run 41387258362](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387258362) | PASS for authenticated API/RLS: own-workspace admin read, collaborator module boundary, resident portal scope, foreign-workspace read/write denial. Not full browser UI. |
| APP-05–07 | [Accounting run 41387923787](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387923787), commit `f7bd8596c59dc33beff0adb9112209fdc10f13af` | PASS for authenticated API workflows: create/edit condominium and unit; expense, allocation, installment/payment persistence; closed-year ledger mutation rejected with unchanged amount. Persistent QA-only closed-year fixture retained for repeatability. |
| APP-08–11 | [Transfer run 41388097584](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41388097584), commit `2a601a364615dc6b6d556c6f774ba77ea0d1602d` | PASS: valid closure, unpaid-installment rejection, failed-closure invariants, unauthenticated denial and cross-workspace denial. Temporary fixtures cleaned; post-run catalog query found zero marked transfer workspaces, condominiums, or transfer rows. |
| APP-12 | [Communication run 41387814274](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387814274), commit `a1277cb71df05dfd54dcdd8c24838bec490e9aea` | PASS for publish/unpublish visibility, recipient preparation, admin-only queue reset and resident denial. No provider email was sent; delivery remains NOT TESTED. |
| APP-13 | [Authenticated RLS/storage run 41387258362](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41387258362) | PASS for actual synthetic document-byte upload/download with role and workspace restrictions; temporary metadata and object removed. |
| APP-14 | QA catalog/ACL checks in §12 | PARTIAL PASS: RLS, relation ownership, MAINTAIN absence and Security Advisor checked. Full owner-specific default-privilege and every-routine ACL parity against a release manifest is still pending. |
| APP-15 | [Role navigation run 41386926063](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41386926063) | PASS for role navigation, refresh and no uncaught browser errors. Full browser regression of every core module and persisted business data remains pending. |

### QA fixture cleanup verification

After the latest transfer and communication runs, a direct QA catalog query returned zero temporary transfer workspaces, transfer condominiums, transfer rows, communication rows and recipient rows. The single `BETHAG_QA_APP07_CLOSED_GUARD_FIXTURE` is intentionally retained as a clearly named QA-only regression fixture; it contains one unit, one closed fiscal year, one ledger entry, one allocation and one installment. Do not delete it until the repeatable APP-07 test is retired.

### Communication RPC repair

A QA-only forward migration artifact, `supabase/rebuild/qa-only-migrations/20261102041805_repair_authenticated_communication_rpc_private_execute.sql`, repairs authenticated EXECUTE on the private communication-recipient routines. The queue-reset implementation additionally checks authentication and workspace communication-management permission. The authenticated communication acceptance run passed recipient preparation, zero-row stale reset, and denial of resident queue manipulation without side effects. No real email delivery was invoked.

**Important release boundary:** these results are authenticated API/database acceptance, plus the narrower browser navigation run. They do not yet establish all 15 complete UI acceptance scenarios. In particular, email provider delivery, full browser accounting and transfer journeys, every APP-14 ACL/default-privilege comparison, and complete APP-15 regression remain outstanding. The formal APP-01–APP-15 table above therefore continues to represent full acceptance as NOT RUN; the partial evidence is recorded here rather than overstated as full PASS.

**Release decision remains NO-GO.** PR #25 remains a draft QA evidence PR and must not be merged. The QA-only communication RPC repair is not part of the frozen Production migration inventory; any future release candidate requires a newly reconciled, ordered migration manifest and fresh Production preflight. Production remains untouched.


## 14. QA branch and release verification update — 2026-11-02 04:26 UTC

- **Current PR CI — PASS:** workflow [run 41388382760](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41388382760), head commit `0591d47e97a385e0e0510753fbcfa8b8f7888080`. Both `postgres-bootstrap` and `build` completed successfully, including 12 canonical migrations on isolated PostgreSQL 17, incremental ACL postconditions, collaborator permission regression, build and public-login browser smoke. This is not authenticated full-module browser acceptance.
- **QA-only migration ledger now contains two additional forward repairs:** `20261102041805_repair_authenticated_communication_rpc_private_execute` and `20261102100000_repair_authenticated_accounting_rpc_private_execute`. The latter grants `authenticated` EXECUTE only on the seven private accounting implementations behind the public invoker RPCs. Both repairs exist only in the QA branch and are not in the frozen Production migration inventory. They must be reviewed and reconciled into a new ordered release candidate before any deployment.
- **QA branch state remains a release blocker:** Supabase branch `bethag-launch-qa` (project ref `jhuyhlzzydcgghrzeexn`) reports `MIGRATIONS_FAILED`, while its preview database reports `ACTIVE_HEALTHY`. The branch list still shows this inconsistent state. Do not reset or delete the branch: it contains the test data needed for acceptance. Its migration ledger is readable and includes the two QA-only repairs, but the branch status has not been reconciled.
- **Current QA inventory — partial evidence:** the Supabase table listing returned 47 public tables, all with RLS enabled. Security Advisor returned `lints: []`. The connector denied direct read-only SQL catalog queries for this branch, so a fresh complete routine ACL/default-privilege comparison could not be executed in this pass. APP-14 therefore remains PARTIAL; do not infer parity from the Security Advisor alone.
- **Performance Advisor — review required, not a security failure:** it reports 55 unused-index notices and 21 multiple-permissive-policy notices, plus one Auth connection-allocation informational notice. These require triage against expected workload; no index or policy was changed.
- **Email delivery:** the project has an active `bethag-send-email` Edge Function and an active `bethag-resend-webhook`, but no test email was sent and no provider delivery/bounce/receipt evidence was collected. APP-12 remains PARTIAL.
- **Acceptance remains NO-GO:** real-auth navigation smoke is still limited to role landing/navigation/refresh. Condominium/accounting/subentro browser journeys, full document UI regression, email provider delivery, complete APP-14 ACL parity, and APP-15 full UI regression remain outstanding. Production was not modified; no merge, branch reset, deployment, or cutover was performed.


## 15. Live QA ACL and UI regression update — 2026-11-02

- **APP-14 live catalog verification — PASS on QA:** 47 public tables, all 47 RLS-enabled; zero RLS-disabled tables; zero non-`postgres` table owners. Effective grants: zero `MAINTAIN` privileges for `anon`, `authenticated`, and `service_role`; zero table data privileges for `anon`; zero public/private functions executable by `anon`; zero SECURITY DEFINER functions executable by `anon`. Current counts: 61 public functions executable by `authenticated`, 33 private functions executable by `authenticated`, 23 private functions executable by `service_role`.
- **Security Advisor:** no security lints (`lints: []`).
- **Default ACL parity:** the `postgres` defaults match `20261023000004_application_default_table_privileges.sql`: authenticated receives ordinary table CRUD only; service_role receives the documented data/structural privileges without MAINTAIN. The `supabase_admin` default ACLs remain broad and platform-managed; they were deliberately preserved as the migration explicitly requires. Effective grants on the current 47 postgres-owned application tables were independently verified and do not expose table access or MAINTAIN to anon.
- **Authenticated invoker/private RPC audit:** eight additional private implementations behind authenticated public invoker wrappers were found without the required authenticated EXECUTE grant. QA-only migration `20261102044224_repair_authenticated_invoker_private_rpc_grants` grants authenticated execution after review of each implementation's auth/workspace/module checks. Archive/restore, delete, communication, and accounting private RPC paths have their own QA-only repairs. Live `has_function_privilege` checks now confirm authenticated execution and no anon execution for the affected functions.
- **Trigger function exposure:** the only two public functions previously executable by anon were trigger-returning functions. QA-only migration `20261102044603_revoke_public_execute_from_public_trigger_functions` removed direct invocation rights; the live anon function count is now zero.
- **QA-only migration ledger additions (not Production):** `20261102041805` communication RPC; `20261102043152` condominium delete RPC; `20261102043315` archive columns; `20261102044002` archive/restore RPC and JSON synchronization; `20261102044102` archive private grants; `20261102044224` additional authenticated invoker/private grants; `20261102044603` trigger-function EXECUTE revocation; `20261102100000` accounting RPC. All are QA-only and must be reconciled into a reviewed release-candidate migration sequence before any Production cutover.
- **Application fixes in the current PR:** no-argument workspace lookup now resolves the authenticated user instead of sending an undefined UUID to PostgREST; condominium unit synchronization uses INSERT plus a verified unique-race fallback instead of an unsupported raw ON CONFLICT target; archive/restore UI now calls the guarded server RPCs and synchronizes structured columns, JSON metadata and audit log; email send guard rejects unpublished communications and accepts both array and boolean-object collaborator permissions. The email guard unit tests passed in CI.
- **Browser acceptance:** three-role navigation and refresh passed. The first APP-05/12 browser attempts exposed test-harness assumptions about a pre-seeded condominium; the test was made self-contained by creating a synthetic condominium and resident portal-access fixture, with service-role cleanup verification. The new run is pending; APP-05/12 UI must not be marked PASS until that run completes.
- **Branch status remains unresolved:** Supabase still reports `MIGRATIONS_FAILED` for `bethag-launch-qa`, while its preview database reports `ACTIVE_HEALTHY` and the migration ledger is readable. The branch-creation logs show initial bootstrap failures while the migration history table and `public.portal_access` were not yet present, plus a stale catalog-query column reference. No branch reset was performed because it would risk the existing QA fixtures.
- **Release decision remains NO-GO.** Production was not modified; PR #25 remains draft and unmerged.


## 15. Live QA ACL verification — 2026-11-02 05:15 UTC

Read-only catalog verification on QA project `jhuyhlzzydcgghrzeexn`:

- Public relations: **47/47 base tables RLS enabled**, 0 with RLS disabled, 0 non-`postgres` owners.
- SECURITY DEFINER routine ACL: **0 EXECUTE grants to PUBLIC or anon** across public/private security-definer functions.
- Private schema: `USAGE` granted to `authenticated` and `service_role`; neither has `CREATE`; `anon` has no `USAGE`.
- Private SECURITY DEFINER execution ACL: 33 routines for `authenticated`, 23 for `service_role`; the authenticated grants correspond to the explicit invoker-wrapper/RLS helper set and the QA-only forward repairs. No PUBLIC/anon execution was found for security-definer routines.
- Application-owned default ACLs for owner `postgres` match the release policy: authenticated gets ordinary CRUD on new public tables; service_role gets CRUD plus REFERENCES/TRIGGER/TRUNCATE; service_role receives sequence access and function EXECUTE; anon receives no application-table defaults; no application role receives default MAINTAIN.
- Existing `supabase_admin` default ACLs remain broad, including MAINTAIN, but are explicitly platform-managed and are not changed by application migrations.
- Relation-level MAINTAIN: 0 for anon, authenticated and service_role after QA-only revocation from the read-only view `public.condominium_fund_availability`. Only postgres retains MAINTAIN on public relations.
- Security Advisor: `lints: []`.

**APP-14 ACL parity: PASS for application-owned objects and privileges**, with the above explicit Supabase-managed `supabase_admin` default-ACL exclusion. This is not evidence of Production live state; Production was not queried or modified in this pass.

The latest QA-only migration `20261102110000_revoke_service_role_maintain_from_fund_availability_view` is recorded in the QA migration ledger and is not in the frozen Production inventory. The QA branch still reports `MIGRATIONS_FAILED` despite preview database `ACTIVE_HEALTHY`; this unresolved branch-status discrepancy remains a release blocker and must not be resolved by resetting/deleting the branch because its QA test data is required.

The latest authenticated browser run `41392503198` has role navigation PASS; the condominium/communication UI workflow is still running at the time of this update. Earlier UI attempt confirmed create/edit/archive/restore path was corrected, but resident visibility of a newly published communication failed. The current rerun adds backend persistence and portal-access diagnostics; APP-12 UI visibility is not yet marked PASS. Email provider delivery remains untested.


## 16. QA migration source reconciliation — 2026-11-02 05:16 UTC

- The live QA migration ledger records `20261102050437_backfill_condominium_archive_metadata`, but the corresponding SQL source is not present at the expected `supabase/migrations/`, `supabase/rebuild/`, or `supabase/rebuild/qa-only-migrations/` paths in the current branch. The original SQL body was not recoverable from prior conversation context.
- Read-only QA data check: 1,029 condominium rows; 0 rows with structured `archived_at`; 0 rows with JSON-only `data.archivedAt`; 0 rows with structured archive timestamp but missing actor. The backfill therefore has no observed archived records to reconcile in the current QA dataset, but its original SQL must still be recovered or formally superseded before Production release.
- Do not fabricate or silently replace the missing migration source. Keep this as an explicit migration provenance blocker in the release checklist.


## 17. Large-workspace hydration and archive UI rerun — 2026-11-02 05:17 UTC

- QA workspace contains approximately 1,029 condominium rows. The authenticated browser diagnostic identified HTTP 400 on the single PostgREST `condominium_units?condominium_id=in.(...)` request containing all condominium UUIDs; this caused backend hydration and navigation refresh to fail and prevented communication persistence.
- Corrected `loadBackendState` to fetch condominium members, units and member transfers in batches of 100 condominium IDs. Commit `65709ac0966df0641064f6546ce16476215f242c`.
- On that commit, CI build and isolated PostgreSQL migration/ACL checks PASS; authenticated role smoke PASS, including role-specific landing and refresh.
- The full authenticated browser workflow then passed through condominium create/edit/archive persistence but failed to render the archived condominium card in the Archive UI. The next run adds an explicit Archive heading wait and captures the rendered page plus persisted DB row. APP-05 full UI remains PARTIAL pending that rerun.
- After the failed run, service-role cleanup verification found zero synthetic condominium, communication or portal-access fixtures remaining.
