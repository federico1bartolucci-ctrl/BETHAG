# Member-transfer post-commit lookup outcome — 2026-11-26

## Finding

The client RPC `confirm_condominium_member_transfer` commits the transfer and returns its transfer UUID. The wrapper then queried the latest 20 active owners for the unit and selected the first matching row. If that post-commit read failed, or the newly inserted member was not visible in that query, the wrapper threw an ordinary error. The UI displayed "transfer failed" and left the confirmation form available, even though the transfer could already be committed. Retrying could create a second transfer attempt. Selecting the latest owner by unit/time also did not prove that the row belonged to the transfer just committed.

The authoritative transfer row already stores `incoming_member_id`.

## Correction

- Resolve the transfer row by workspace, condominium, unit and returned transfer UUID.
- Resolve the incoming member by the exact `incoming_member_id` stored on that transfer.
- Treat every read after a successful RPC as reconciliation, not as proof that the RPC failed.
- Return a committed/partial outcome with a stable reason code when the follow-up read is unavailable or inconsistent.
- Refresh backend state, close/reset the form and explicitly tell the operator not to retry until the unit and transfer history have been checked.
- Preserve ordinary error behavior when the RPC itself returns an error.

## Regression

`scripts/test-member-transfer-post-commit-read-failure.mjs` is imported by the existing `test-member-transfer-confirm-outgoing-member-ids.mjs`, which is already part of `npm test`.

The regression covers post-commit transfer lookup failure, incoming-member lookup failure, missing transfer/member references, wrong member identity, invalid owner state, successful exact-member resolution, and the UI no-retry/reconciliation path.

## Safety and limits

- Isolated branch based on current main.
- No QA or Production reads/writes.
- No SQL migration, Supabase deployment, merge, deploy, reset or manual workflow dispatch.
- The regression uses the pure outcome helper and production-source wiring assertions; it does not perform a live Supabase transfer.
