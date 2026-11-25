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
- Ledger history was reconciled against PostgreSQL statement logs, not guessed from names:
  - `20261125161407 / require_plus_plan_for_communications` — initial entitlement SQL applied at 16:14:07 UTC.
  - `20261125161639 / 20261125141500_require_plus_plan_for_communications` — second, revised application of the same logical entitlement candidate at 16:16:39 UTC. It still exposed the two public RPCs as SECURITY DEFINER.
  - `20261125162259 / communications_rpc_security_invoker` — follow-up at 16:22:59 UTC that moved privileged implementations to private SECURITY DEFINER wrappers and made the public RPCs SECURITY INVOKER.
- These are three real execution records, including two successive versions of the first logical intervention. They are not safe to delete or rewrite. The QA ledger is intentionally retained as-is; no migration was replayed during reconciliation.
- Live PostgreSQL catalog checks:
  - Both plan-entitlement triggers are present on `communications` and `communication_recipients`.
  - Both public RPCs are SECURITY INVOKER; EXECUTE is granted to authenticated/service_role and denied to anon.
  - The underlying private recipient implementations deny direct EXECUTE to authenticated and anon.
  - The two guarded private wrappers and the plan helper are SECURITY DEFINER with empty search paths and EXECUTE granted to authenticated/service_role.
  - `private` schema USAGE is denied to anon but granted to authenticated. The database-side `pgrst.db_schemas` setting is not exposed by the SQL interface, so the Data API exposed-schema list still requires confirmation in project API settings; do not claim this check closed yet.
- Supabase Security Advisor returned **0 lints**.
- QA `bethag-send-email` is ACTIVE at version 20. Retrieved deployed function bundle and compared contents byte-for-byte with the reviewed branch files: `index.ts`, `communication-send-guards.js`, and `workspace-plan-entitlement.js` all match exactly.
- Rollback-only QA database matrix passed with no persisted fixtures:
  - Existing Free workspace: communication content edit and new communication insert rejected.
  - Plus, Professional and Portal: publication, recipient preparation and stale-recipient recovery succeeded.
  - After downgrade of each paid fixture to Free: content edits and recipient identity changes rejected; unpublishing and delivery-status finalization remained allowed.
  - Collaborator module permission `true` allowed recipient preparation; explicit `false` and absent permission were denied.
  - All synthetic users, workspaces, condominiums, communications and recipients were rolled back. A follow-up count confirmed zero test workspaces remained.
- No real Resend email was sent. Only the Free workspace exists as persistent QA business data; paid-plan fixtures were temporary transaction-scoped tests.

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

- Latest head at time of this record: `bb6c390fb7170d105fa7d7e8fd20d2082890da24`.
- Baseline Safety run [45656759542](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45656759542): **SUCCESS**, including migration-baseline and ACL safety plus clean bootstrap.
- Build + PostgreSQL 17 run [45656759533](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45656759533): still running at the time of documentation; do not treat it as passed until the workflow reports SUCCESS.
- The latest CI test now covers the Free/Plus UI gate and prevents local-only Communications add-on activation.

## Remaining gates

1. Confirm the Data API exposed-schema list explicitly excludes `private`; current SQL catalog checks establish ACLs but cannot read the project-level exposed-schema setting.
2. Confirm Build + PostgreSQL 17 run 45656759533 completes SUCCESS on the current code head; rerun after this documentation-only commit if needed.
3. Review the full PR dependency chain and integrate the communications correction only through the canonical release path; keep the candidate outside `supabase/migrations` until approved.
4. Keep Production unchanged until a separate explicit release go/no-go decision.
