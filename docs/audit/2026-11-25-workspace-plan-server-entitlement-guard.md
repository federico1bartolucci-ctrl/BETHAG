# Server-managed workspace plan and AI entitlement guard

## Finding

The two AI Edge Functions authenticate the caller and verify active workspace membership/role, but do not enforce the plan requirements used by the frontend:

- `bethag-ai-document`: Plus or higher;
- `bethag-ai-condominium`: Professional or higher.

The global `BETHAG_AI_ENABLED` flag is not a per-workspace entitlement check.

A server-side check against `workspaces.plan` alone would still be bypassable on the baseline schema: authenticated workspace admins have table-level UPDATE on `public.workspaces`, and the `admins can manage workspaces` RLS policy is `FOR ALL`. The client could therefore self-upgrade the plan before calling the AI Edge Function.

The subscription `addons` array is currently local client state, not an authoritative database entitlement. It must not be accepted by an Edge Function as proof of purchase.

## Correction

- Add a forward-only candidate trigger that prevents authenticated/anonymous clients from changing `workspaces.plan`; only `postgres` and `service_role` can change the server-managed plan.
- Read the plan from `workspaces` through the caller's authenticated Supabase client after membership authorization.
- Require Plus for document AI and Professional for AI condominium creation.
- Fail closed with HTTP 403 when the plan is insufficient/unknown and HTTP 503 when the plan lookup cannot be completed.
- Ignore client-supplied plan/add-on fields.
- Add a Node runtime matrix to `npm test`.
- Add an isolated PostgreSQL 17 regression to the existing `test:clean-install` rehearsal; it proves the admin RLS predicate passes but the plan trigger rejects the client update, while `service_role` can still update the plan.

## QA execution record — 25 November 2026

- Applied to QA branch `bethag-launch-qa` only, recorded as `20261125164447 / 20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements`.
- Installed trigger `trg_workspace_plan_server_managed` on `public.workspaces`.
- Reproduced the authenticated workspace-admin self-upgrade before application. After application, the same role is rejected with `WORKSPACE_PLAN_SERVER_MANAGED`.
- Verified `service_role` can still change the server-owned plan.
- Both update paths were tested in a rollback-only transaction; the persistent QA workspace remains Free.
- This migration is a hard prerequisite for any feature whose server authorization trusts `workspaces.plan`, including AI, Portal and Communications. Apply it before their respective plan-entitlement guards in the eventual Production promotion order.
- QA Security Advisor remains at zero lints.

## Production

- No Production migration or write was performed.
- Production ledger remains 267 rows, latest `20261105050000`.
- This candidate remains outside `supabase/migrations` pending the controlled release process.

## Safety

- The PostgreSQL 17 regression requires a loopback-only `DATABASE_URL` and rolls back its fixtures.
- The QA validation used explicit transactions and verified the persistent plan remained unchanged.
- Production was not accessed for this intervention.
- No merge, Production deployment, reset or manual final-QA dispatch was performed.
- Final QA remains a separate release gate.
