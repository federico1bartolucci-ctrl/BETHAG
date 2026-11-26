# Audit — fail-closed linking for resident invitations

**Date:** 26 November 2026

## Finding

The resident invitation Edge Function previously updated `condominium_members.user_id` by member ID and checked only the Supabase error field. A PostgREST UPDATE that matched zero rows can return no error. If the member was concurrently removed or changed after the initial lookup, the function could continue and upsert `portal_access`, reporting success without having linked the underlying condominium member.

## Correction

- Scope the link update by member ID, condominium ID and legacy member ID.
- Request the updated row representation with `.select("id")`.
- Treat an empty returned row set as a conflict (HTTP 409).
- Stop before creating `portal_access` when no member row was actually linked.
- Include `invitationSent` in the conflict response and disclose that the invitation email may already have been sent, because Auth invitation may already have been created before the concurrent deletion is detected.

## Regression coverage

The isolated Deno test `scripts/test-edge-function-invite-positive.mjs` simulates a zero-row PostgREST UPDATE after the Auth invitation. It asserts HTTP 409, discloses that the invitation may already have been sent, and confirms that no `portal_access` upsert occurs. Existing owner/tenant invitation and invalid-role cases remain covered.

The test uses mocked Auth/DB services; no real email or Supabase project is used. It is already part of the repository Build workflow.

## Safety

No database migration is required. No QA/Production changes, deployment, reset, or manual workflow dispatch.
