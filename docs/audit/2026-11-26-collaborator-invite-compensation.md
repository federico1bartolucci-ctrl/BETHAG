# Collaborator invitation partial-state handling — 26 November 2026

## Finding reproduced

The collaborator invitation Edge Function sends an Auth invitation before creating the profile and workspace membership. A later profile or membership write can fail after the Auth email has been sent. The previous generic catch returned HTTP 500 without exposing whether the invitation was sent or whether the membership was linked.

The existing legacy-ID unique-conflict path also attempted to delete the newly invited Auth user and its cascaded profile.

## Safety finding

Auth users and `profiles` are global identities, while `workspace_members` is scoped by workspace. Deleting an Auth user from one failed workspace invitation can cascade its profile and memberships in other workspaces. The Edge Function cannot safely infer global ownership or serialize every other workspace-linking path before deleting that identity.

The correction therefore does not perform destructive Auth/profile cleanup from either failure path. It reports the partial state and requires reconciliation. This deliberately prefers preserving a shared identity over deleting data that may belong to another workspace.

## Correction

- Track the invitation, profile creation and workspace-link stages.
- Return `failureStage`, `invitationSent`, `profileCreated`, `workspaceMemberLinked` and `requiresReconciliation`.
- Use stable error code `COLLABORATOR_INVITE_PARTIAL_FAILURE` for failures after partial side effects.
- Preserve the existing HTTP 409 code for the workspace legacy-ID conflict and explicitly tell the administrator that the invitation email may already have been sent.
- Do not delete Auth users or global profiles from these failure paths.

## Regression

The existing `scripts/test-collaborator-invite-legacy-id-uniqueness.mjs` is already part of `npm test`. It now:
- reproduces the canonical unique-index conflict after Auth/profile creation;
- reproduces a separate non-unique PostgreSQL check-constraint failure after Auth/profile creation;
- verifies both cases preserve the global Auth user and profile;
- verifies the response state requires reconciliation;
- verifies failures after a linked membership are also reported as partial;
- verifies no-partial-side-effect failures do not request reconciliation;
- verifies neither failure path contains destructive Auth/profile deletion.

The tests use PGlite and pure runtime helpers. No real invitation is sent.

## Dependency and safety

This PR is stacked on #579 because both changes touch the collaborator invitation Edge Function. PR #579 supplies the modern Supabase secret-key transport fix.

No QA or Production access/writes, merge, deployment, reset or manual workflow dispatch.
