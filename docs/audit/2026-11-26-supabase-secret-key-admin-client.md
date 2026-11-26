# Supabase modern secret-key transport guard — 26 November 2026

## Finding reproduced

The Resend webhook already strips the automatically generated `Authorization: Bearer sb_secret_...` header because modern Supabase secret API keys are not JWTs. The resident and collaborator invitation Edge Functions also accept `SUPABASE_SECRET_KEYS`, but constructed their admin clients directly with `createClient(url, secretKey, ...)`.

supabase-js places its configured API key in both `apikey` and `Authorization` by default. For a modern `sb_secret_*` key, the latter is not a JWT and the Supabase gateway can reject the request with `PGRST303`. This leaves invitation operations unable to use the same modern secret-key configuration already supported by the webhook.

## Correction

- Add one shared `createSupabaseAdminClientOptions` helper.
- Disable session persistence and automatic token refresh for server-side admin clients.
- For `sb_secret_*` keys only, remove the generated Authorization header at the fetch boundary while preserving `apikey`, request method, body and other headers.
- Preserve the normal Authorization behavior for legacy service_role JWT keys.
- Apply the helper to resident and collaborator invitation Edge Functions.

## Runtime regression

`scripts/test-supabase-secret-key-admin-client.mjs` is added to `npm test`.

It verifies:
- modern secret key remains in `apikey`;
- invalid Bearer Authorization is removed;
- method, body and unrelated headers are preserved;
- legacy service_role JWT behavior is unchanged;
- both invitation Edge Functions use the shared helper;
- empty admin keys fail closed.

## Scope and safety

- No database migrations.
- No QA or Production access or writes.
- No Auth invitations are sent by the regression.
- No merge, deploy, reset or manual workflow dispatch.
