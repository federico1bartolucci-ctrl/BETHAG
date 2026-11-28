# Insurance policy condominium resolution must be workspace-scoped

Date: 2026-11-28

## Finding

`InsurancePoliciesSection` resolved `condominiums` using only `legacy_id`. The canonical baseline defines `condominiums_workspace_legacy_unique` on `(workspace_id, legacy_id)`, so a legacy ID is not globally unique. If a user belongs to two workspaces that both contain legacy condominium ID 42, `.maybeSingle()` can receive multiple rows and the insurance section fails to resolve the selected condominium. The policy list query also omitted `workspace_id`.

## Correction

- Pass the active workspace from `App` through `CondominiumDetails` into `InsurancePoliciesSection`.
- Resolve the condominium by both `workspace_id` and `legacy_id`, and verify the returned workspace.
- Scope policy reads by both `workspace_id` and the resolved condominium UUID.
- Include workspace in the request-generation context so a slow response from the previous workspace cannot update the new one.
- Key visible policy state by workspace as well as legacy condominium ID, preventing stale policies from appearing when two workspaces reuse the same legacy ID.

PR #93 already scopes policy updates and deletes; this finding is distinct and addresses the read/resolution path.

## Regression

`scripts/test-insurance-policy-workspace-scope.mjs` covers two workspaces sharing the same legacy ID, invalid/missing context, wrong-workspace resolver results, policy query filters, workspace-aware stale-load guards, parent prop propagation, the baseline uniqueness constraint and `npm test` registration.

## Safety

- Isolated branch from `main` at `27bfe3f5f3a05544009f13e977cfd437dcd327d6`.
- No schema or migration changes.
- No QA or Production database/Storage access or writes.
- No merge, deploy, reset or manual workflow dispatch.
