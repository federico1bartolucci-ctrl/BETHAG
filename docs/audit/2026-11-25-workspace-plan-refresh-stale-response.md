# Workspace plan refresh: reject stale asynchronous responses

## Finding

The authenticated navigation refresh in `src/main.tsx` read `workspaces.plan`, immediately wrote it into the cached subscription, and only checked the effect's `cancelled` flag after the subsequent full backend hydration.

When a user changed workspace while a refresh was in flight, the previous effect was cancelled, but its plan lookup could still resolve and overwrite the new workspace's plan before the later cancellation check. Example: workspace A is Portal, workspace B is Free; B's response applies first, then A's delayed response restores Portal in the UI.

This did not bypass database or Edge Function entitlement checks. It caused a stale client entitlement snapshot, misleading feature availability and avoidable 403 responses in the newly selected workspace.

## Reproduction

1. Start an authenticated refresh for workspace A and hold its plan query response.
2. Switch to workspace B; cleanup marks A's effect as cancelled.
3. Resolve B's plan as `free`.
4. Resolve A's older plan as `portal`.
5. Before the fix, the old refresh wrote Portal into the current subscription before checking cancellation.

## Correction

- Add `src/lib/workspace-plan-snapshot.js`.
- Check request freshness both before and after the asynchronous plan read.
- Apply only recognized server-owned plans.
- Use the guarded helper for initial plan lookup, authenticated hydration and navigation refresh.
- Keep existing server-side database and Edge Function entitlement checks authoritative.

## Runtime regression

`scripts/test-workspace-plan-refresh-race.mjs` starts two overlapping plan lookups, applies the current workspace's Free plan, then resolves the cancelled previous workspace's Portal response. It verifies that the cached subscription is not overwritten. It also covers pre-read cancellation, invalid plan values and optional synchronization of a separate server-plan state.

The test is wired into `npm test`.

## Safety

Draft PR based on current main. No QA or Production access/writes, no merge, deployment, reset or manual workflow dispatch.
