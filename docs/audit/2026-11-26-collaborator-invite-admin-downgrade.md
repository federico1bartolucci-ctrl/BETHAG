# Collaborator invitation must preserve workspace-admin role

## Finding

The collaborator invitation Edge Function looked up an existing workspace member by `workspace_id + legacy_id`, but selected only `user_id`. It then upserted that membership with `role: "collaborator"`. If the legacy ID belonged to an existing workspace administrator, the invitation path could downgrade the membership role even though the profile-level role was preserved separately.

## Correction

- Load both `user_id` and `role` from the existing workspace membership.
- If the existing membership role is `admin`, return HTTP 409 with stable code `COLLABORATOR_INVITE_ADMIN_DOWNGRADE_BLOCKED`.
- Reject before Auth invitation, profile changes, or workspace membership upsert.
- Keep the endpoint's existing caller authorization: only an active workspace admin can invite collaborators.

## Regression

A source-wiring regression verifies role selection, the explicit admin guard, stable error code/status, and ordering before Auth invitation and membership upsert. It is wired into `npm test`.

## Safety

Reconstructed directly on current main `1f0e2739a143d376515eb14b1f12c99578a8f094`. No schema/migration changes, QA/Production access or writes, deployment, reset, restore, or manual workflow dispatch.
