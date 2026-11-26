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
- Both update paths were tested in rollback-only transactions; the persistent QA workspace remains Free.
- Deployed and verified QA Edge Functions against the reviewed branch source:
  - `bethag-ai-document` v16: exact source match; server-side plan check requires Plus.
  - `bethag-ai-condominium` v19: exact source match; server-side plan check requires Professional.
- The Portal and Communications guards depend on this trigger; the eventual Production promotion order must apply the server-managed plan guard before Portal and Communications entitlement migrations.
- QA Security Advisor after all related QA migrations and Edge Function deployments: **0 lints**.

## Production

- No Production migration, Edge Function deployment or data write was performed.
- Production ledger remains 267 rows, latest `20261105050000`.
- Production AI Edge Function versions were not changed.
- This candidate remains outside `supabase/migrations` pending the controlled release process.

## Safety

- The PostgreSQL 17 regression requires a loopback-only `DATABASE_URL` and rolls back its fixtures.
- QA validation used explicit transactions; the synthetic workspace, users and communication fixtures were rolled back. The persistent QA workspace remains Free.
- QA Edge Function deployment changed only the two AI functions on the QA branch; no external OpenAI request was made.
- Production was not modified. No merge, Production deployment, reset or manual final-QA dispatch was performed.
- Final QA remains a separate release gate.
