# Last-active-admin deletion precheck: consistent snapshot

## Finding

The account-deletion guard used exact-count offset pagination. Comparing the exact count on each page detects inserts/deletes that change the total, but it does not detect a same-count replacement between requests.

A concrete sequence is:
1. The first page contains workspace-00501 later in the ordered set.
2. Between page requests, that membership is removed and workspace-01206 is added.
3. The total remains 1,205.
4. The next offset page starts one row later, omitting workspace-00501 and including the new row.
5. No duplicate is returned and every page reports the same exact count.

The paginated reader therefore returned a mixed set while satisfying its current count and duplicate checks.

## Correction

- Replace the multi-request membership scan with public.has_last_active_workspace_admin(uuid).
- The SQL function evaluates all of one user's active-admin memberships and the corresponding co-admin existence checks in one SQL statement snapshot.
- Grant execution only to service_role; the Edge Function calls it through ctx.supabaseAdmin.rpc.
- Use the same RPC before Auth deletion and after a failed Auth deletion for HTTP 409 classification.
- Keep the workspace_members trigger from the parent PR as the authoritative guard for changes that occur after the precheck and before Auth deletion.

This does not make the precheck and GoTrue Auth deletion one transaction. The database trigger remains essential and is the final invariant.

## Runtime regression

scripts/test-delete-account-last-admin-precheck.mjs:
- reproduces the same-count offset-pagination replacement race;
- executes the replacement SQL function in PGlite with 1,205 memberships;
- verifies last-admin, co-admin, inactive-admin and collaborator cases;
- verifies service-role-only EXECUTE privileges;
- verifies both Edge Function checks use the single-statement RPC;
- is wired into npm test.

## Safety

This consolidation updates the existing draft PR #497 stack on the current main commit, preserving the existing #442 and #447 dependencies. It keeps both migrations in proposed-forward-migrations and does not rewrite canonical migration history. The build workflow adds an isolated PostgreSQL 17 concurrency rehearsal; no QA or Production environment is accessed or modified, no Auth deletion is executed, and no deployment, reset, or manual workflow dispatch is performed.
