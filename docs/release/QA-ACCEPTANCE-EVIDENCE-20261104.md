# BETHAG — QA acceptance evidence, 4 November 2026

**Target:** isolated Supabase QA branch `jhuyhlzzydcgghrzeexn`  \
**Repository branch:** `ops/qa-secret-validation-20261102`  \
**Commit tested:** `76c7777f36e0670cc711638c11250d7e2e92040f`  \
**GitHub Actions:** [run 41930800999](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41930800999)  \
**Disposition:** automated QA run PASS; overall release remains **NO-GO**.

## Evidence from the completed run

Both jobs completed successfully.

- Build, public-login browser smoke and authenticated QA browser workflow job: **PASS**.
- Isolated PostgreSQL 17 bootstrap and baseline checks: **PASS**.
- All 14 canonical migrations executed by the guarded runner on the isolated PostgreSQL instance: **PASS**.
- Incremental hardening catalog/ACL checks, collaborator permission enforcement with RLS, and canonical ledger rehearsal: **PASS**.
- Real Supabase Auth sign-in, role-specific landing, refresh/session persistence, explicit logout and fresh sign-in: administrator, collaborator and resident **3/3 PASS**.
- Role navigation: administrator, collaborator and resident **3/3 PASS**.
- APP-05: **PASS** — condominium/unit creation and editing persisted; archive/restore and structured archive metadata verified.
- APP-06: **PASS** — €125.50 expense, 1,000-millesimi allocation and installment persisted.
- APP-07: **PASS** — database rejected a ledger mutation against the persistent QA-only closed-year fixture; original amount remained unchanged.
- APP-08/11 transfer subset: **PASS** — preview, authorization boundary, multi-co-owner 60/40 transfer, incoming owner persistence, outgoing owner closure, and automatic deactivation of the outgoing owner's portal access were observed.
- APP-09 transfer financial-blocker subset: **PASS** — €90 unpaid installment, €30 member carryover and €45 unit carryover prevented closure; transfer, owner, installment and carryover state remained unchanged after rejection.
- APP-12 publication subset: **PASS** — administrator publish/withdraw visibility was reflected for the resident.
- Temporary APP-05/06 fixtures were deleted and verified absent. The APP-07 closed-year fixture was retained intentionally. APP-08/11 temporary test rows were cleaned by the test script.

## Scope limits and outstanding acceptance

A green CI run does not close every APP acceptance criterion.

- APP-08 remains partial: outgoing portal access revocation was checked, but a full incoming-owner portal registration/login and access verification was not performed.
- APP-11 remains partial: database-level rejection/rollback invariants passed; complete UI rollback proof is still required.
- APP-12 remains partial: publication visibility passed; multi-recipient delivery, real inbox receipt, bounce and complaint processing were not tested.
- APP-14 remains open: the run performed a read-only Production security/ACL parity check, but it does not resolve the provider migration status or all Production/default-privilege approval gates.
- APP-15 remains partial: three-role sign-out/sign-in and navigation smoke passed; exhaustive core-module regression is not established by this run.
- APP-01–04 and APP-13 were not rerun in this particular workflow run; their earlier independent evidence must be tracked separately and must not be inferred from this run.

The browser log also records one aborted background synchronization request (`net::ERR_ABORTED`) without uncaught page errors or a failed test assertion. It is non-fatal in this run but remains a diagnostic observation for the final collaudo.

## Safety and release decision

- No Production schema, data, migration, deployment or cutover operation was performed by this run.
- The PostgreSQL migration rehearsal was isolated and disposable.
- The PR remains draft and is not authorized for merge.
- Production release remains **NO-GO** until the outstanding APP acceptance items, QA/provider migration disposition, Production ACL/default-privilege parity, review of the PR change scope, and explicit cutover approval are complete.

## Follow-up evidence — 5 November 2026

**Commit tested:** `724533ec7e09a195496f425f5461342e80a6acf5`  
**Full CI:** [run 41932062809](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41932062809) — both jobs **SUCCESS**.  
**Dedicated real-account authentication:** [run 41932055131](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41932055131) — administrator, collaborator and resident **3/3 PASS**.

- Build, public-login browser smoke, authenticated QA edit/archive diagnostic: **PASS**.
- PostgreSQL 17 fresh bootstrap, baseline, all 14 canonical migrations, incremental catalog/ACL postconditions, collaborator permission/RLS regression and isolated canonical-ledger transaction rehearsal: **PASS**.
- APP-05: **PASS** — condominium and hierarchical unit created and reread through a real administrator session.
- APP-06: **PASS** — €125.50 expense, 1,000-millesimi allocation and unpaid installment persisted through the UI.
- APP-07: **PASS** — database rejected a ledger mutation against the closed-year QA fixture; original amount remained unchanged.
- APP-08/11 transfer subset: **PASS** — preview, authorization boundary, duplicate co-owner email rejection with rollback, two incoming co-owners at 50/50 through UI, persisted ownership shares and individual metadata, zero-balance closure, outgoing owner archival and portal-access deactivation; incoming co-owners visible after navigation without hard reload.
- APP-09 blocker subset: **PASS** — unpaid €90 installment and €30 member / €45 unit carryovers blocked closure without changing transfer, owner, installment or carryover state.
- APP-12 publication subset: **PASS** — publication and withdrawal visibility confirmed for resident.
- Role navigation: administrator, collaborator and resident **3/3 PASS**. Real Auth sign-in, role landing, session refresh, logout and fresh sign-in: **3/3 PASS**.
- Cleanup reported successful for temporary fixtures; the designated closed-year QA fixture remains intentionally present.
- One background synchronization request ended with `net::ERR_ABORTED`; no uncaught page errors and no failed test assertion were reported. Keep this as a non-fatal diagnostic observation.

The real-account auth script currently emits the label “resident profile hydration” in its checks list for all three roles although the hydration wait is executed only for the resident role. The PASS result is valid for the actual checks, but the diagnostic label is imprecise and should be corrected in a later script cleanup.

## Remaining release gates (unchanged)

- APP-08: incoming-owner registration, real login and portal access still need end-to-end proof.
- APP-11: full UI rollback proof remains outstanding; database rollback/blocker invariants alone are insufficient.
- APP-12: multi-recipient delivery, real inbox receipt, bounce and complaint processing remain untested.
- APP-14: resolve provider migration status and complete Production ACL/default-privilege parity evidence and approval.
- APP-15: exhaustive core-module regression remains outstanding; current role navigation/auth smoke is not a substitute.
- Review the very broad PR #36 scope and its current non-mergeable state before any merge decision.
- APP-01–04 and APP-13 evidence remains separate and must be verified against current code/environment before final acceptance.

## APP-08 registration defect and candidate repair — 5 November 2026

A QA transaction reproduced a runtime failure in the live `private.complete_portal_registration` routine: PostgreSQL rejected its unqualified `ON CONFLICT DO UPDATE` because a conflict target is mandatory for `DO UPDATE`. The same invalid pattern was present in `private.admin_approve_portal_registration`. The failing test transaction was rolled back; a follow-up query confirmed zero residual temporary condominiums.

Candidate migration `20261105120000_fix_portal_registration_upsert.sql` was added to the repository and to the frozen, review-only cutover sequence as migration 15. It introduces a shared private helper that resolves a portal row through either the workspace legacy key or the case-insensitive condominium/email key, fails closed if those keys identify conflicting rows, and is used by both resident auto-registration and administrator approval. The cutover candidate now expects 15 forward migrations and a 259-row final ledger (244 historical rows preserved + 15 new rows); Production remains frozen and untouched.

The candidate migration was applied inside a QA SQL transaction, then `public.complete_portal_registration` was invoked with a verified existing QA Auth identity and a temporary unique member. Assertions for the returned approved status, exact member ID, active `portal_access` link and active resident `workspace_members` link passed. The entire transaction was rolled back and a subsequent query confirmed no residual fixture. This proves the database registration path with an existing verified identity; it does **not** prove creation of a new Auth user, receipt/confirmation of an invitation, or real browser login by a newly registered owner.

**Disposition: APP-08 remains OPEN.** The migration is not yet applied persistently to QA. The full 15-migration isolated CI rehearsal is queued behind the previous serialized QA workflow. After CI passes, apply the candidate to QA through the approved version-preserving migration path and complete the new-owner browser registration/login/portal hydration test. No Production operation, merge or deployment was performed.


## Follow-up CI correction — 5 November 2026

**Commit tested:** `3854d310d9c9c73965ba8d2e5e240a74c33978b4`  
**Full CI:** [run 41935793241](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41935793241) — both jobs **SUCCESS**.

- Build, migration-history reconciliation, Production function security/ACL parity check, communication authorization/publication guards and authenticated QA edit/archive diagnostic: **PASS**.
- Isolated PostgreSQL 17 fresh baseline bootstrap: **PASS**.
- All 15 canonical migrations executed through the guarded runner on isolated PostgreSQL: **PASS**.
- Incremental hardening catalog and ACL postconditions: **PASS**.
- Collaborator module permission enforcement with RLS: **PASS**.
- Canonical migration-ledger transaction rehearsal against the 15-migration structural inventory: **PASS**.

This CI result supersedes the preceding failed rehearsal caused by a stale expected function count (171 instead of 172); the expectation was corrected and the full workflow then passed. It proves the isolated migration path, not that migration 15 has been persistently applied to the live QA Supabase project.

**APP-08 remains OPEN.** The live QA migration ledger was last checked and did not yet contain `20261105120000_fix_portal_registration_upsert`. The candidate must still be applied to QA using the approved version-preserving migration path, followed by a true new-owner Auth registration/email-verification/browser-login and portal-access hydration test. No Production operation, merge or deployment was performed. Overall release remains **NO-GO**.
