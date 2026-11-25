# Audit — server-side Plus entitlement for communications

**Date:** 25 November 2026

## Finding

The Free workspace administrator authorization path allowed communication writes because the baseline RLS policy on `public.communications` and `public.communication_recipients` relied on `private.can_manage_workspace_module(..., 'comunicazioni')`, which checks workspace role/module permission but not the server-owned plan.

The same omission existed in:
- `private.prepare_communication_recipients(uuid)`;
- `public.reset_stale_communication_recipients(uuid, interval)`;
- `bethag-send-email`, which checked publication and membership/role but did not check the workspace plan before calling recipient preparation and Resend.

The frontend labels Communications as a Plus feature, but the client-side plan gate was not an authorization boundary.

## Reproduction

On an isolated PostgreSQL 17 clean-install database, before the candidate migration, an authenticated Free workspace admin:
1. passed `private.can_manage_workspace_module(..., 'comunicazioni')`;
2. changed a communication to `published=true`;
3. successfully called `public.prepare_communication_recipients`;
4. reset a stale queued recipient.

No Resend request was made during the database reproduction.

## Correction

Candidate migration:
`supabase/rebuild/proposed-forward-migrations/20261125141500_require_plus_plan_for_communications.sql`

- Adds `private.workspace_has_plus_plan(uuid)`, accepting only Plus, Professional and Portal.
- Requires Plus-or-higher for communication creation, publication/content changes and recipient identity/creation.
- Guards recipient preparation and stale-queue recovery through SECURITY DEFINER functions in the unexposed private schema.
- Keeps public RPC endpoints SECURITY INVOKER; they delegate to the guarded private wrappers, avoiding public SECURITY DEFINER exposure while preserving authenticated RPC access.
- Revokes direct authenticated execution of the underlying private recipient-preparation and stale-queue implementations.
- Keeps delivery-status/provider-field finalization and unpublishing available after downgrade, so in-flight sends and provider webhooks can complete without losing their ledger updates.
- Keeps the candidate outside `supabase/migrations`; canonical history and Production manifests are unchanged.

The `bethag-send-email` Edge Function now checks the server-owned workspace plan after membership authorization and before recipient preparation or any Resend API request. Plan lookup failures fail closed with HTTP 503; insufficient plans receive HTTP 403.

## Regression coverage

- `npm test`: plan matrix, missing/unknown plans, query errors, Edge Function ordering before preparation/Resend, and candidate wiring.
- `npm run test:clean-install`: real PostgreSQL 17 regression on the disposable loopback database. It reproduces the Free-plan baseline bypass before applying the candidate, then verifies Free denial, Plus allowance, downgrade behavior and status-finalization compatibility.

## QA / Production execution record — 25 November 2026

This section supersedes the earlier safety statement about database access. The candidate was subsequently exercised in the dedicated QA branch.

### QA

- Supabase branch: `bethag-launch-qa`, project ref `jhuyhlzzydcgghrzeexn`, parent Production project `tctcgptrsmvgajqjgnev`.
- Four relevant QA ledger records are retained:
  - `20261125161407 / require_plus_plan_for_communications` — initial communications entitlement SQL.
  - `20261125161639 / 20261125141500_require_plus_plan_for_communications` — revised application of the same logical communications correction.
  - `20261125162259 / communications_rpc_security_invoker` — public RPCs changed to SECURITY INVOKER with guarded private wrappers.
  - `20261125164447 / 20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements` — server-managed workspace-plan trigger, applied as a required dependency after discovering that QA still allowed authenticated admins to self-upgrade.
- The two communications applications and the SECURITY INVOKER follow-up are real PostgreSQL log executions. No ledger row was deleted or rewritten. QA ledger now contains 287 rows; latest version is `20261125164447`.
- **Critical dependency found and corrected in QA:** before the final record above, the Free workspace admin could update `workspaces.plan` to Plus through the existing UPDATE grant and admin `FOR ALL` RLS policy. This was reproduced inside a transaction and rolled back. The communications plan trigger alone was therefore bypassable by self-upgrade.
- The server-managed plan migration is already present on main at `supabase/rebuild/proposed-forward-migrations/20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements.sql`. It is now applied only to QA. Live catalog confirms `trg_workspace_plan_server_managed` is installed. Authenticated self-upgrade is rejected with `WORKSPACE_PLAN_SERVER_MANAGED`; `service_role` can change the plan. A rollback-only test verified both paths and confirmed the persistent workspace remains Free.
- End-to-end QA transaction passed: Free admin could neither self-upgrade nor create a communication; after a temporary `service_role` plan change, the authenticated admin could create, publish and prepare recipients. The transaction rolled back; no workspace plan, communication or recipient data persisted, and no email was sent.
- Rollback-only QA matrix also passed:
  - Free: communication content edit and new communication insert denied.
  - Plus, Professional and Portal: publication, recipient preparation and stale-queue recovery allowed.
  - After downgrade to Free: content/recipient identity changes denied; unpublish and delivery-status finalization allowed.
  - Collaborator permission `true` allowed recipient preparation; explicit `false` and absent permission denied.
  - All synthetic users and business fixtures were rolled back.
- Frontend alignment is now part of PR #473: Communications is server-managed, included from Plus upward, and cannot be unlocked through client-local add-on state. Its UI no longer advertises a standalone price until a server-owned billing entitlement exists. Creation, editing and email sending are gated by Plus; Portal publication remains gated by Portal.
- QA `bethag-send-email` is ACTIVE at version 20. Retrieved deployed bundle matches the reviewed main-branch files byte-for-byte for `index.ts`, `communication-send-guards.js`, and `workspace-plan-entitlement.js`.
- Both communications public RPCs are SECURITY INVOKER; direct authenticated EXECUTE on underlying private recipient implementations is revoked. Security Advisor: **0 lints**.
- `private` schema USAGE is denied to anon and granted to authenticated (required by the SECURITY INVOKER public wrappers). The SQL interface cannot read the project's Data API exposed-schema setting, so explicit confirmation that `private` is not exposed remains an open gate.

### Production

- Production remains ACTIVE_HEALTHY on PostgreSQL 17.6.1.
- Its ledger remains 267 rows, latest version `20261105050000`.
- Production `bethag-send-email` remains version 15.
- The communications entitlement migration and Edge Function update have **not** been applied to Production. No Production writes were made for this intervention.

### CI evidence

- Code-validation head: `c4f3f5b6740bb28a6f2e00a4eb76b166185617c3`. The subsequent commit `b39897eed5927bf99b0554efa72765d029c72835` changes audit documentation only.
- Build run [45652940372](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45652940372): SUCCESS, including all Edge Function type-checks, communication authorization/publication guards, PostgreSQL 17 bootstrap and clean-install rehearsals.
- Baseline safety run [45652938868](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45652938868): SUCCESS.
- PR remains Draft and unmerged. The candidate remains outside `supabase/migrations`; canonical Production history and manifests are unchanged.

### Frontend entitlement alignment

- Found and corrected a second bypass/mismatch: the local subscription UI advertised Communications as a standalone €2.90/month add-on, although the database and Edge Function correctly required Plus or higher and had no server-managed Communications add-on entitlement.
- Communications is now marked server-managed alongside AI and Portal. A client-local `subscription.addons` value cannot unlock it; Plus, Professional and Portal include the feature by plan hierarchy.
- The standalone price was removed from the UI. The subscription page now explains that Communications, AI and Portal are plan-controlled, not individually purchasable until server-side billing entitlements exist.
- Plus gating now runs before communication creation, editing, email-composer opening, and before any email communication is inserted/sent. Database and Edge Function enforcement remain authoritative.
- Added regression coverage to `scripts/test-subscription-server-managed-addons.mjs` for forged local add-ons, plan hierarchy, UI messaging, and each communication entry point.
- This is a UI/security-alignment correction; it does not change the QA database schema or Production.

### Latest CI

- Code head containing all application and regression-test changes: `bb6c390fb7170d105fa7d7e8fd20d2082890da24`.
- Final audit/documentation head before this CI record: `ad8896d653988578473634cc1a802fd9a137fe05`.
- Build + PostgreSQL 17 run [45657730999](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45657730999): **SUCCESS**.
- Baseline Safety run [45657731067](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45657731067): **SUCCESS**.
- Verified Edge Function type-check, communication authorization/publication guards, migration baseline/ACL safety, clean PostgreSQL 17 bootstrap, 28-migration clean-install rehearsal, 19-migration canonical rehearsal, Vite build and isolated browser smoke.
- The successful baseline job also runs `npm test`, including the server-managed Communications add-on and Plus action-gate regression assertions.
- Earlier intermediate attempts exposed test-assertion mistakes; those assertions were corrected and the final code head passed all checks.

## Remaining gates

1. Confirm Data API exposed schemas explicitly exclude `private`.
2. Keep the server-managed plan guard migration before the communications entitlement migration in the eventual Production promotion order; the former is a hard dependency, not an optional AI-only change.
3. Review the full PR dependency chain and canonical migration promotion path.
4. Keep Production unchanged until a separate explicit release go/no-go decision.
