# APP-14 — Production release recertification status

**Updated:** 2026-11-25  
**Current main candidate:** `5c096c4a0f48b4b4ec3eacf08787e1c36fae5dc5`  
**Release fingerprint:** `48b093b22bea647fdd6a99388909415c377a8e8080cf14ab19a1419eb48eeed4`  
**Production project:** `tctcgptrsmvgajqjgnev`  
**Disposition:** **PARTIAL / NO-GO — historical 19-migration cutover is present; QA entitlement hardening is verified; Production promotion remains blocked**

## Latest QA follow-up — 25 November 2026 (supersedes earlier QA gaps)

The QA environment was subsequently used to validate the communications entitlement correction and its server-managed plan dependency. This does not change the Production disposition.

- QA branch: `bethag-launch-qa`, project ref `jhuyhlzzydcgghrzeexn`.
- QA ledger now has **287 rows**, latest `20261125164447`. Four retained records cover the two initial communications guard applications, the SECURITY INVOKER follow-up, and the server-managed workspace-plan guard. No ledger rows were deleted or rewritten.
- A Free workspace administrator's ability to self-upgrade `workspaces.plan` was reproduced in a rollback-only transaction. The server-managed plan candidate was then applied to QA only as `20261125164447 / 20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements`.
- After application, authenticated self-upgrade is rejected with `WORKSPACE_PLAN_SERVER_MANAGED`; `service_role` can still update the plan. An end-to-end rollback-only test proved a Free admin cannot self-upgrade or create communications; a temporary service-role upgrade enabled create/publish/recipient preparation, then all changes were rolled back.
- Plus, Professional and Portal communication flows passed publication, recipient preparation and stale-queue recovery checks. Downgrade-safe unpublishing/status finalization and collaborator permission true/false/absent were also verified. No real Resend email was sent.
- QA `bethag-send-email` is ACTIVE at version **20** and its deployed entrypoint plus both shared entitlement helpers match the reviewed main-branch files byte-for-byte.
- QA Security Advisor: **0 lints**.
- QA workspace fixture remains Free with its original four communications and zero recipient rows after all rollback tests.
- PR #473 remains Draft and unmerged. Its code adds SECURITY INVOKER RPC hardening and aligns the UI so client-local add-ons cannot unlock Communications on Free.
- The explicit Data API exposed-schema setting for `private` has not yet been verified. This remains an open QA/release gate.

## 1. Exact candidate and QA evidence

- PR #466 (server-side Plus entitlement for Communications) is merged. Current main is `5c096c4a0f48b4b4ec3eacf08787e1c36fae5dc5`.
- Final authenticated QA workflow [45644127205](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45644127205): **SUCCESS**, exact current main SHA. The workflow's SHA trust gate passed; all steps completed successfully.
- APP-01..04 and APP-13 real-auth RLS/storage checks: PASS.
- APP-05..07 condominium, accounting and closed-period checks: PASS.
- APP-08..11 transfer, unpaid-position, rollback and carryover checks: PASS.
- APP-12 communication recipient preparation and signed webhook checks: PASS.
- Authenticated browser APP-05/06/08/11/12 flows: PASS, no page errors.
- APP-15 navigation and real Auth/session persistence: PASS for admin, collaborator and resident.
- Reversible QA Portal-plan fixture was restored; workflow explicitly reported `restoredPlan: free`.
- Live Resend send probe was intentionally SKIPPED. No real email was sent.
- Fingerprint from the exact workflow checkout: `48b093b22bea647fdd6a99388909415c377a8e8080cf14ab19a1419eb48eeed4`; source SHA emitted by the fingerprint script: `5d96342209be77e189012dec754bc764999e64e2`.

## 2. Fresh read-only Production evidence — 2026-11-25

Supabase connector reached Production project `tctcgptrsmvgajqjgnev` using database role `postgres`:
- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.6.1.
- Live migration ledger: **267 rows**, sorted head `20261105050000`.
- Compared all live version/name pairs against the frozen 248-row historical snapshot plus the 19 approved canonical increments: **267/267 exact; no missing or unexpected pairs**.
- Compared all 19 approved SQL Git blob hashes against current `main`: **19/19 exact**.
- Executed `supabase/rebuild/production-cutover-postflight-20261105.sql` read-only: completed without exception. Its 47-table, ACL/default-ACL, RLS, routine, ledger, portal registration and transfer invariants passed.
- The apparent 48th public relation in a broad relation count is the `condominium_fund_availability` view; the postflight correctly distinguishes it from the 47 base tables. This is not a table-count drift.
- No Production schema, data, ACL or migration-ledger writes were made during these checks.

**Important:** the previous 19-migration cutover is already reflected in Production. Do not reapply those 19 migrations and do not replay or rewrite the historical ledger.

## 3. Remaining Production blocker discovered

PR #466's communications plan-entitlement correction is merged in application source, but its database candidate is deliberately still outside the canonical migration directory:

`supabase/rebuild/proposed-forward-migrations/20261125141500_require_plus_plan_for_communications.sql`

- Current Production still grants authenticated EXECUTE directly on `private.prepare_communication_recipients(uuid)` and `private.reset_stale_communication_recipients(uuid, interval)`. The candidate migration revokes these direct grants and adds server-side Plus-or-higher enforcement for communication content/publication and recipient identity/preparation.
- Production Edge Function `bethag-send-email` is currently deployed at version **15**. Its deployed source does **not** perform the workspace-plan entitlement check before recipient preparation/Resend.
- Current `main` source includes `checkWorkspacePlanEntitlement` before recipient preparation and external Resend calls. It has not yet been deployed to Production.
- The isolated PostgreSQL 17 regression and unit tests passed in PR #466/#473 CI. The candidate and its server-managed plan prerequisite have now been applied and verified in QA only; this is not evidence of Production deployment.
- Therefore APP-12 functional QA on the current main does not close the Production plan-entitlement deployment gap.

This remains the concrete outstanding Production correction. QA validation is complete for the plan guard and communications entitlement behavior, but Production still requires a reviewed forward-migration package and controlled Edge Function deployment, followed by verification. No candidate SQL was applied to Production and no Production Edge Function was deployed.

## 4. APP-14 gate matrix

| Gate | Current disposition | Evidence / remaining action |
|---|---|---|
| Exact-main build and final authenticated QA | PASS | Run [45644127205](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45644127205), exact SHA |
| 19 canonical migrations / historical ledger | PASS | 267 exact pairs; 19/19 blob hashes match |
| Production read-only postflight | PASS | Reviewed SQL completed without exception |
| Communications Plus entitlement DB correction | QA PASS / Production NOT DEPLOYED | QA ledger records four retained candidate executions; Production requires reviewed promotion and controlled application |
| `bethag-send-email` Production deployment | NOT DEPLOYED | QA v20 matches reviewed source; Production v15 still lacks the plan check |
| Data API exposed-schema Dashboard check | NOT VERIFIED TODAY | Operator must confirm both `supabase_functions` and `private` are not exposed |
| Current provider backup visibility | NOT VERIFIED TODAY | Operator must verify a current identifiable backup before any Production DDL |
| Provider-managed physical restore | NOT TESTED | Previously accepted residual risk; do not describe as tested |
| Live Resend delivery | NOT TESTED | Intentionally excluded; requires separate authorization and controlled recipient |
| New maintenance plan / operator / STOP recovery | PENDING | Required only if the reviewed candidate requires Production DDL/deployment window |
| Final owner approval | PENDING FOR NEW CANDIDATE | Must bind exact SHA, candidate SQL hash, Edge Function source and Production project |

## 5. Next execution sequence — no restart of completed work

1. Complete PR #473, including explicit confirmation of the Data API exposed-schema list and exact-head CI.
2. Reconcile communication recipient retry PRs #419/#421 before promotion: their draft migrations grant authenticated EXECUTE directly on the private recipient functions, so they must be applied before the final #473 revoke/SECURITY INVOKER hardening, or their grants must be removed. Never apply them after the final revoke without re-hardening.
3. Build the reviewed Production migration package in dependency order: server-managed workspace-plan guard first; any approved recipient retry implementation changes next; communications entitlement guard and final SECURITY INVOKER/direct-EXECUTE revocation last. Preserve the canonical freeze and generate a new exact hash/fingerprint.
4. Prepare the Production deployment package pinned to exact main SHA, migration hashes and Edge Function source/dependencies.
4. Immediately before Production changes, recheck Data API exposed schemas and current provider backup in Dashboard; preserve physical-restore status as NOT TESTED.
6. Obtain explicit owner approval for this new candidate and the Production Edge Function deployment. The historical 2026-11-08 approval applies only to the already-present 19-migration scope and cannot authorize this new change.
7. Deploy only the approved candidate and Edge Function; verify direct private RPC denial for authenticated, plan-gate behavior, function version/source, and read-only postflight.
8. Only after those checks may APP-14 be reconsidered for PASS.

## 6. Safety record

The 2026-11-25 Production inspection was read-only. It did not alter schema, data, ACLs, migration history, Edge Functions, email delivery or backup settings. QA plan and communication tests used rollback-only fixtures except for the explicitly applied forward-only QA migrations; the persistent QA workspace remains Free. No Production migration or Edge Function deployment has been performed.

**Decision: APP-14 remains PARTIAL / Production NO-GO.** The original 19-migration ledger reconciliation is closed; the remaining concrete blocker is deployment and verification of the newly merged communications Plus entitlement correction, plus the operator-only Dashboard/backup checks and fresh approval.
