# Collaborator invitation compensation — 26 November 2026

## Finding reproduced

The collaborator invitation Edge Function sends an Auth invitation before creating the profile and `workspace_members` link. The pre-existing compensation ran only for the workspace legacy-ID unique-index conflict. A different database failure during profile creation or membership upsert reached the generic catch, which returned HTTP 500 without removing the newly invited Auth user or reporting that the invitation email had already been sent.

The runtime regression reproduces a generic PostgreSQL check-constraint failure after the Auth user and profile exist. Before compensation, both rows remain while the workspace membership is absent.

## Correction

- Track the invitation, profile-creation and workspace-link stages outside the request's try block.
- On a failure before the membership is linked, remove only the Auth user invited by this request; its profile is removed by the Auth-user FK cascade.
- If an existing Auth user had a profile created by this request, remove only that newly created profile.
- Never delete an existing Auth user or a user whose workspace membership was already linked.
- Report `failureStage`, `invitationSent`, `workspaceMemberLinked`, `cleanupAttempted`, `cleanupFailed` and `invitationAccountRemoved` in the failure response.
- If the Auth invitation was sent but its user ID is unavailable, fail closed and report that compensation could not be completed.

The existing legacy-ID conflict path uses the same compensation helper, retaining its HTTP 409 behavior.

## Regression

The existing `scripts/test-collaborator-invite-legacy-id-uniqueness.mjs` is already part of `npm test`. It now additionally:

- reproduces a non-unique membership-write failure after Auth/profile creation;
- verifies the orphan Auth user and profile exist before compensation;
- verifies successful compensation removes the new Auth user and cascaded profile;
- verifies cleanup errors are surfaced;
- verifies no destructive cleanup occurs after the workspace membership is linked;
- verifies a missing Auth user ID fails closed;
- verifies the Edge Function wires compensation into the generic catch.

The tests use PGlite and mocked Auth operations. No real invitation is sent.

## Dependency and safety

This PR is stacked on #579 because both changes touch the collaborator invitation Edge Function. The parent PR provides the modern Supabase secret-key transport fix.

No QA or Production access/writes, merge, deployment, reset or manual workflow dispatch.
