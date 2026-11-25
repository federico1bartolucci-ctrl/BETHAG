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
- Six actual QA ledger records are retained; no row was deleted or rewritten:
  - `20261125161407 / require_plus_plan_for_communications` — initial communications entitlement SQL.
  - `20261125161639 / 20261125141500_require_plus_plan_for_communications` — revised application of the same logical correction.
  - `20261125162259 / communications_rpc_security_invoker` — public RPCs changed to SECURITY INVOKER with guarded private wrappers.
  - `20261125164447 / 20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements` — server-managed workspace-plan trigger.
  - `20261125165530 / require_server_portal_plan_for_resident_access` — Portal plan helper, resident access RLS and Portal management/registration guards.
  - `20261125165536 / require_portal_plan_for_communication_publication` — database enforcement that Portal publication requires the Portal plan.
- QA ledger has **289 rows**, latest version `20261125165536`. The QA execution order reflects incremental discovery; the eventual Production promotion order must follow dependencies: server-managed plan guard, Portal plan guard, Plus communications guard, then Portal-publication follow-up.
- The authenticated Free workspace-admin self-upgrade bypass was reproduced before the plan guard. After application, authenticated plan changes are rejected with `WORKSPACE_PLAN_SERVER_MANAGED`; `service_role` can change the plan. The persistent QA workspace remains Free.
- Rollback-only live QA matrix passed across all tiers:
  - **Free:** cannot self-upgrade, create/edit/publish communications, or prepare recipients; delivery-status metadata finalization remains allowed.
  - **Plus:** can create/edit communications, prepare recipients and recover stale delivery queues; cannot publish to the resident Portal or create resident Portal access.
  - **Professional:** inherits Plus communication/send rights; cannot publish to the resident Portal or create resident Portal access.
  - **Portal:** can publish and edit published communications and create resident Portal access.
  - **Portal downgrade to Plus:** residents lose Portal read access; administrators retain read/deactivation rights; published communications can be unpublished; delivery-status metadata can still be finalized.
  - **Free downgrade:** communication content changes remain blocked while delivery-status finalization remains allowed.
  - All synthetic users, workspaces, condominiums, communications and recipients were rolled back. Follow-up counts show zero test workspaces/users persisted. Existing QA data remains one workspace and one Portal-access row.
- Portal RLS/registration migration was exercised in QA. Existing Portal rows were not deleted; access is controlled by the server-owned plan.
- Frontend alignment in PR #473: Communications is server-managed, included from Plus upward, cannot be unlocked through client-local add-on state, and no longer advertises a standalone €2.90/month purchase. Creation, editing and email sending are gated by Plus; Portal publication remains gated by Portal.
- QA Edge Functions deployed and verified against reviewed source:
  - `bethag-ai-document` **v16**, exact bundle match; server plan check requires Plus.
  - `bethag-ai-condominium` **v19**, exact bundle match; server plan check requires Professional.
  - `bethag-send-email` **v20**, exact bundle match; server plan check requires Plus before recipient preparation or Resend.
- Both communications public RPCs are SECURITY INVOKER; direct authenticated EXECUTE on underlying private recipient implementations is revoked. Security Advisor after all QA migrations and deployments: **0 lints**.
- `private` schema USAGE is denied to anon and granted to authenticated (required by the SECURITY INVOKER public wrappers). The SQL interface cannot read the project's Data API exposed-schema setting, so explicit confirmation that `private` is not exposed remains an open gate.
- No real OpenAI request or Resend email was sent during these tests.

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

## Cross-PR migration interaction

- Open PR #419 and stacked PR #421 replace `private.prepare_communication_recipients` / `private.reset_stale_communication_recipients` in `supabase/rebuild/drafts`.
- Their current draft SQL grants EXECUTE on those underlying SECURITY DEFINER functions directly to `authenticated`. PR #473's final migration intentionally revokes those grants and exposes only the guarded public SECURITY INVOKER wrappers.
- Therefore, if #419/#421 are promoted, their function-replacement migrations must be applied **before** the final #473 communications ACL hardening, or their direct grants must be removed. Applying #419/#421 after #473 without re-hardening would reopen a direct RPC path around the Plus/module wrapper checks.
- PR #418 is the base of #419 and also changes `src/main.tsx` for backup restore; #473 changes the same large application file in separate subscription/communications regions. Rebase/merge conflict review is required when those branches are integrated.
- PRs #439/#441 concern Resend webhook concurrency/retry behavior and do not modify the communications entitlement RPCs directly, but their tests must be retained in the eventual integrated suite.

## Remaining gates

1. Confirm Data API exposed schemas explicitly exclude `private`.
2. Keep the server-managed plan guard migration before the communications entitlement migration in the eventual Production promotion order; the former is a hard dependency, not an optional AI-only change.
3. Reconcile PRs #419/#421 before final RPC hardening; their direct EXECUTE grants must not be applied after the #473 revocation. Review #418's overlapping main.tsx changes and preserve webhook tests from #439/#441.
4. Keep Production unchanged until a separate explicit release go/no-go decision.

## Follow-up UI submission guard

The Communications form's Plus/Portal checks run from a React `onSubmit` handler. A denied module or plan guard must still call `preventDefault()` before returning; otherwise the browser can perform its native form GET/reload and discard the form state. The stacked UI follow-up is tracked separately in PR #476. It preserves the existing plan checks and does not change database entitlement behavior.
