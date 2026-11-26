# Paginated Auth-user lookup in invitation flows

## Finding

Both resident and collaborator invitation Edge Functions used a single `auth.admin.listUsers({ page: 1, perPage: 1000 })` request when `inviteUserByEmail` reported that the email already existed. If the matching Auth account was beyond the first 1,000 users, the handler incorrectly treated the account as absent and failed the invitation fallback.

## Correction

- Extract one shared Auth directory lookup for both Edge Functions.
- Normalize the requested and stored email addresses with trim + lowercase.
- Fetch bounded pages of 1,000 users until a match is found or the first short page proves the directory has ended.
- Propagate Auth API errors and reject malformed page responses instead of silently treating them as no match.
- Avoid duplicate pagination implementations between resident and collaborator invitation.

## Regression

The runtime test mocks a full first page and locates the target on page two, checks normalized email matching and early stop, tests the no-match final-page case, and verifies API/transport/malformed-response/empty-email failures. It also checks both Edge Functions use the shared helper.

The regression is wired into `npm test`. Edge Function type-check and the full Build/PostgreSQL/Baseline CI must pass on one exact PR head before merge.

## Safety

No migration/schema changes. No QA/Production access or writes, deployment, reset, restore, or manual workflow dispatch.
