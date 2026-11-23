# Harden active-admin membership pagination response validation — 2026-11-23

## Finding

The account-deletion membership loader treated any successful non-array Supabase response as an empty membership list. It also did not validate each returned workspace ID or enforce page ordering. An unexpected malformed response could therefore bypass the last-active-admin guard.

## Correction

- Reject non-array successful query responses.
- Reject oversized pages.
- Reject missing/blank workspace IDs.
- Require workspace IDs to be strictly ascending across and within pages.
- Return an error rather than partial membership results; the delete-account handler checks the error before deleting the auth user.

## Runtime regression

The existing runtime test is extended to reproduce malformed responses (object instead of array, missing workspace ID, oversized page, and out-of-order rows). Each case must fail closed without requesting another page. It also asserts the edge function checks membership-loader errors before the auth-user deletion call.

## Safety

This extends the existing draft PR #384 rather than opening a duplicate. No QA or Production data changes, merge, deployment, reset, or workflow dispatch.
