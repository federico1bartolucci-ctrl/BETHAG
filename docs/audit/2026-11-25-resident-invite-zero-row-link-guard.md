# Audit — fail-closed linking for resident invitations

**Date:** 25 November 2026

## Finding

The resident invitation Edge Function previously updated `condominium_members.user_id` by member ID and checked only the Supabase error field. A PostgREST UPDATE that matched zero rows can return no error. If the member was concurrently removed or changed after the initial lookup, the function could continue and upsert `portal_access`, reporting success without having linked the underlying condominium member.

This is distinct from the open invitation PRs concerning Auth metadata persistence (#136/#215) and paginated Auth user lookup (#141/#216/#266).

## Correction

- Scope the link update by member ID, condominium ID and legacy member ID.
- Request the updated row representation with `.select("id")`.
- Treat an empty returned row set as a conflict (HTTP 409).
- Stop before creating `portal_access` when no member row was actually linked.
- Include `invitationSent` in the conflict response and disclose in the error message that the invitation email may already have been sent, because Auth invitation may already have been created before the concurrent deletion is detected.

The change does not write to QA or Production and does not introduce a database migration.

## Regression coverage

The existing isolated Deno test `scripts/test-edge-function-invite-positive.mjs` now simulates a zero-row PostgREST UPDATE after the Auth invitation. It asserts:
- the endpoint returns HTTP 409;
- the response discloses that the Auth invitation was already sent;
- no `portal_access` upsert occurs;
- normal owner/tenant invitation and invalid-role cases remain covered.

The Build workflow already runs this Deno test with mocked Auth/DB services; no real email or Supabase project is used.

## Safety

Draft-only branch. No QA/Production changes, merge, deploy, reset, or manual workflow dispatch.
