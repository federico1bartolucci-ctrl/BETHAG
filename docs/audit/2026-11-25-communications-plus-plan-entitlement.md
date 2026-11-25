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
- The QA migration ledger currently contains these three feature-related rows:
  - `20261125161407 / require_plus_plan_for_communications`
  - `20261125161639 / 20261125141500_require_plus_plan_for_communications`
  - `20261125162259 / communications_rpc_security_invoker`
- The first two rows are duplicate-looking registrations for the initial entitlement intervention. They must remain visible as QA history until formally reconciled; do not delete ledger rows or replay either migration.
- Live catalog inspection confirms both entitlement triggers exist; the public recipient RPCs are SECURITY INVOKER; the private Plus wrappers are SECURITY DEFINER with empty search paths; direct authenticated execution of the underlying unguarded private recipient functions is revoked.
- Security Advisor returned zero lints after the latest QA state.
- QA `bethag-send-email` is ACTIVE at version 20. The only current QA workspace fixture is Free; therefore a full live end-to-end Plus/Professional/Portal workflow matrix has not been demonstrated on QA.
- Automated tests on the PR cover the entitlement matrix: Free, unknown and missing plans are denied; Plus, Professional and Portal are allowed. The PostgreSQL 17 regression covers the Free bypass reproduction, denial after the guard, Plus allowance and downgrade/status-finalization behavior.

### Production

- Production remains ACTIVE_HEALTHY on PostgreSQL 17.6.1.
- Its ledger remains 267 rows, latest version `20261105050000`.
- Production `bethag-send-email` remains version 15.
- The communications entitlement migration and Edge Function update have **not** been applied to Production. No Production writes were made for this intervention.

### CI evidence

- PR head: `c4f3f5b6740bb28a6f2e00a4eb76b166185617c3`.
- Build run [45652940372](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45652940372): SUCCESS, including all Edge Function type-checks, communication authorization/publication guards, PostgreSQL 17 bootstrap and clean-install rehearsals.
- Baseline safety run [45652938868](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45652938868): SUCCESS.
- PR remains Draft and unmerged. The candidate remains outside `supabase/migrations`; canonical Production history and manifests are unchanged.

## Remaining gates

1. Reconcile the two duplicate-looking QA ledger rows without deleting or rewriting history.
2. Confirm the private schema is not exposed through the Data API and retain the current function ACL boundary.
3. Run QA authenticated end-to-end checks against appropriate Plus, Professional and Portal fixtures (or a rollback-safe fixture strategy), including downgrade and in-flight delivery behavior.
4. Reconcile the deployed QA Edge Function version 20 with the exact reviewed source and deployment evidence.
5. Update the canonical migration/deployment manifest only after the candidate is approved for promotion.
6. Keep Production unchanged until a separate explicit release go/no-go decision.

