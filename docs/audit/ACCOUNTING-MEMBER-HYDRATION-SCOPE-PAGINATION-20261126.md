# Accounting member hydration scope and pagination — 2026-11-26

## Findings

- Accounting member hydration was workspace-filtered but fetched only the first PostgREST response page, so larger condominiums/workspaces could silently omit members after the API row limit.
- The member loader accepted malformed successful responses (null or non-array data), oversized pages, duplicate/missing IDs, and rows whose condominium relation did not belong to the active workspace.
- The unified-installment owner lookup filtered by condominium and active status but omitted the workspace predicate.
- The Accounting load error guard omitted the allocation-intake query result, allowing that read failure to be missed.

## Correction

- Use a deterministic, workspace-scoped paginated loader with stable created_at/id ordering.
- Validate every page and every member ID; verify the returned condominium relation is in the active workspace; fail closed on malformed data.
- Add workspace scope to the unified-installment member lookup.
- Include allocationIntakesResult in the common load-error propagation guard.

## Regression coverage

- Multi-page hydration, workspace scoping, stable ordering and pagination failure.
- Null/non-array data, oversized pages, duplicate or missing IDs, and foreign-workspace relation rejection.
- Workspace, condominium, active-member and selected-unit predicates on unified-installment lookup.
- Allocation-intake read error included in the load failure guard.

## Safety

Application, query, test and documentation changes only. No migrations, QA/Production database access or writes, resets, Supabase deployments or paid service activation.
