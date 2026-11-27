# Condominium unit generation: pagination and legacy rename guard

Date: 2026-11-27

## Finding

During `saveCondominium`, existing units were read with a single unpaginated PostgREST query. A condominium with more than the API row cap could omit legacy rows such as `Interno 1001`, causing the generator to attempt a duplicate insert instead of renaming the existing unit.

The legacy rename UPDATE also checked only `error`. If a unit disappeared or became inaccessible after the read, PostgREST could return no error and no updated row. The code then continued as if the rename had succeeded, leaving the requested unit code absent.

## Reconciliation

Existing draft PR #257 addresses pagination in this same `saveCondominium` query. This branch carries that pagination behavior and adds an executable pagination regression together with the distinct zero-row rename guard. It is intended to supersede #257 after exact-head CI passes.

PR #160 covers other unit lookup paths (member save, unit save, member deletion, and backend sync); it is not duplicated or modified here.

## Correction

- Extract deterministic 1,000-row unit loading into `loadExistingCondominiumUnits`.
- Scope every page by condominium and workspace.
- Abort on any later-page error or malformed page response.
- Require the renamed row ID using `.select("id").maybeSingle()`.
- Verify the returned ID equals the expected legacy unit ID.
- On a zero-row or mismatched response, report explicitly that condominium metadata was saved but the legacy unit rename was not confirmed; require reload and verification before retry.

No SQL migration.

## Runtime regression

`scripts/test-condominium-unit-legacy-rename-zero-row.mjs` is wired into `npm test`. It exercises:
- 1,001 units across two pages;
- stable ordering and workspace/condominium scoping;
- later-page failure;
- empty condominium input;
- successful rename result;
- zero-row UPDATE with no database error;
- mismatched returned ID;
- database/RLS error propagation;
- production wiring and npm test registration.

## Safety

- Isolated branch based on main `647339a551f3dcae4e3fad8250b656ef2d5755ff`.
- No QA or Production access or writes.
- No merge, deployment, reset, or manual workflow dispatch.
