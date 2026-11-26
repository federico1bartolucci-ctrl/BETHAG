# Accounting member hydration workspace scope — 2026-11-26

## Finding
The Accounting page loaded `condominium_members` without a `workspace_id` predicate, unlike surrounding workspace-scoped queries. This allowed the client hydration request to ask for rows outside the active workspace and risked cross-workspace member data entering in-memory accounting selectors if RLS policies or data shape changed.

## Correction
- Add `.eq("workspace_id", workspaceId)` to the Accounting members query.
- Preserve the existing projection and `.order("created_at")`.
- Do not alter pagination behavior in this focused correction.

## Regression
Added `scripts/test-accounting-members-workspace-scope.mjs` and wired it into `npm test`. The check verifies the query projection, workspace predicate, and absence of an unrelated limit change.

## Integration method
The earlier PR #599 was based on a parent SHA immediately before PR #597 changed main. Its narrow change has been re-applied to a clean branch based directly on current main; no historical stacked branch commits were carried forward.

## Safety
No QA or Production access/writes, Supabase migrations/deployments, resets, or paid services. CI runs only use isolated test infrastructure.
