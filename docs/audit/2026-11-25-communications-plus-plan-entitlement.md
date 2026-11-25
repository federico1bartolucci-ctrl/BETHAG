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
- Guards the SECURITY DEFINER recipient-preparation RPC.
- Guards the public stale-recipient reset RPC.
- Keeps delivery-status/provider-field finalization and unpublishing available after downgrade, so in-flight sends and provider webhooks can complete without losing their ledger updates.
- Keeps the candidate outside `supabase/migrations`; canonical history and Production manifests are unchanged.

The `bethag-send-email` Edge Function now checks the server-owned workspace plan after membership authorization and before recipient preparation or any Resend API request. Plan lookup failures fail closed with HTTP 503; insufficient plans receive HTTP 403.

## Regression coverage

- `npm test`: plan matrix, missing/unknown plans, query errors, Edge Function ordering before preparation/Resend, and candidate wiring.
- `npm run test:clean-install`: real PostgreSQL 17 regression on the disposable loopback database. It reproduces the Free-plan baseline bypass before applying the candidate, then verifies Free denial, Plus allowance, downgrade behavior and status-finalization compatibility.

## Safety

Draft stacked on PR #463 (Portal entitlement), which itself depends on PR #461 (server-managed workspace plan). The candidate remains outside the deployable migration chain. No QA/Production database access or mutation, merge, deployment, reset, or manual workflow dispatch.
