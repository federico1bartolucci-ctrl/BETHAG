# Collaborator invite legacy-ID collision cleanup

## Defect

The canonical partial unique index `workspace_members_workspace_legacy_unique` enforces one non-null legacy ID per workspace. The collaborator invitation Edge Function creates or resolves an Auth user and ensures a profile before attempting the membership upsert. If a concurrent request claims the same workspace legacy ID first, the losing upsert fails with PostgreSQL `23505`, but the previously created Auth user/profile could remain without a workspace membership.

The failure is specific to this unique index; unrelated uniqueness, foreign-key, and other database failures must retain their existing error handling.

## Correction

- Identify only SQLSTATE `23505` diagnostics naming `workspace_members_workspace_legacy_unique`.
- Do not overwrite an existing profile until the membership upsert has successfully claimed the workspace legacy ID.
- Insert a profile only when it does not already exist, preserving the foreign-key prerequisite for a newly invited user.
- On the exact legacy-ID conflict, delete only the Auth user invited by this request, or only the profile created by this request for a pre-existing Auth user.
- Never delete an existing Auth user or pre-existing profile.
- Return HTTP 409 with a stable `COLLABORATOR_LEGACY_ID_ALREADY_ASSIGNED` code and explicitly report whether cleanup failed.
- Keep unrelated database errors on the existing HTTP 500 path.

## Regression coverage

The PGlite regression reproduces the canonical unique-index collision after Auth/profile creation, verifies cleanup and cascade, and checks that the same legacy ID in another workspace and multiple NULL IDs remain valid. It also checks that unrelated constraint failures are not misclassified and that pre-existing users/profiles are preserved.

The PostgreSQL 17 clean-install regression runs only against the workflow's disposable local database, wraps fixtures in a transaction and rolls them back. It verifies the real canonical index and Auth-to-profile cascade.

Both tests are wired into `npm test` and `npm run test:clean-install`, respectively.

## Safety

- Reconstructed directly on current `main`; no stale branch commits carried forward.
- No migration or schema change.
- No QA/Production access or writes, no deployment, reset, restore, or manual workflow dispatch.
- CI exact-head required before merge.
