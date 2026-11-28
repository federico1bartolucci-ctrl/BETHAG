# Audit — Register work update scope and zero-row handling

Date: 2026-11-28

## Finding

The Register work editor updated an existing `condominium_works` row using only `id` and `workspace_id`. The edit form did not retain the original condominium context, while the update payload used the currently selected condominium ID.

The update also did not request a returned row. PostgREST can report no error when an UPDATE affects zero rows (for example after a concurrent deletion or when row-level security filters the row). The handler could continue into history/audit handling without proving that the intended work row was updated.

This is distinct from the existing supplier-scope follow-up (#297) and register-item scope guard: it protects the Register work editor.

## Correction

- Capture the original workspace, condominium database ID and selected legacy condominium when opening an existing work.
- Reject a stale workspace/condominium context before issuing the update.
- Verify that the payload still targets the captured workspace and condominium.
- Scope the UPDATE by work ID, original workspace ID and original condominium ID.
- Require `select("id").maybeSingle()` to return the exact work ID; treat zero-row and mismatched-row results as failures.
- Clear the captured edit scope on new-work, cancel and successful-save paths.

## Regression

The runtime test covers:
- normal scoped update and exact PostgREST filters;
- selection change while the resolved database ID is stale;
- resolved condominium change;
- workspace change;
- cross-scope payload rejection;
- zero-row UPDATE with no database error;
- mismatched returned row;
- query error propagation;
- production handler and `npm test` wiring.

## Safety

- Isolated branch from current `main`.
- No schema or migration changes.
- No QA or Production access/writes.
- No merge, deploy, reset or manual workflow dispatch.
