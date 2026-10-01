# Authenticated session and local-cache isolation review — batch 27

Date: 2026-10-01  
Branch: `bethag-migration-repair`  
Source: `src/main.tsx` blob `21d8e17a84840f1767cfd704258ad2f7abb7760a`; `src/lib/supabase.ts` inspected at same branch.  
Review type: static source inspection only; no runtime tests or code changes.

## Verified source behavior

1. Core arrays initialize from `load(KEYS.*, initial*Array)`. The storage keys are global browser keys (e.g. `bethag-condominiums-v5`), not visibly namespaced by workspace or authenticated user in the reviewed declarations.
2. Supabase mode initializes `sessionRole` to null, but core UI state still initializes from local storage or demo fixture arrays.
3. The backend hydration effect resolves the authenticated session and workspace, then loads server state. It sets a cancellation flag on cleanup and checks it after asynchronous work, which is a useful guard against stale completion after effect cleanup.
4. The hydration effect dependency list is `[sessionRole]`, while it reads `profile.workspaceId`. A workspace change that leaves `sessionRole` unchanged will not by itself rerun this effect. Other app flows may remount or alter role; that is not established in this static check.
5. Hydration errors are caught and logged to console in the reviewed effect. No visible loading/error/retry state is set in that catch block.
6. The sync effect requires Supabase, a workspace ID, `backendHydrated.current`, and admin/collaborator role. It schedules `syncBackendState` after 500 ms and logs rejected writes. UI state is updated before that asynchronous persistence is confirmed.
7. Ordinary logout signs out, clears role/email/permissions and removes session/page keys, but does not clear all domain data from local storage or reset every domain state in the reviewed function. Account deletion separately calls `localStorage.clear()`; this is not equivalent to ordinary logout and should not be generalized.
8. `src/lib/supabase.ts` defaults to the BETHAG project URL and publishable key if environment values are absent; Supabase is enabled when `VITE_SUPABASE_ENABLE` is undefined or exactly `true`. Environment configuration must therefore be explicit and validated for each deployment/test target.

## Risk statement

The source supports a **credible stale-cache / workspace-transition risk**, not proof that one user's records have been exposed to another. Server RLS and hydration may prevent unauthorized backend reads, and sync has a hydration guard. The unresolved issue is whether stale local state can be shown or accidentally persisted around session/workspace transitions, especially when hydration fails or a same-role workspace switch occurs.

## Narrow remediation sequence (not applied)

- Introduce a single session/workspace transition boundary that first disables background sync, invalidates pending hydration, and prevents domain views from rendering cached data for the prior identity.
- Namespace or avoid persistent domain caches in configured Supabase mode; preserve offline/demo behavior only behind an explicit demo mode.
- Make hydration status explicit (`loading`, `ready`, `error`) and block editing/sync until the active workspace is fully loaded; offer retry without falling back silently to sample data.
- Trigger hydration on both authenticated identity and resolved workspace changes, using a request generation/cancellation guard so older responses cannot win.
- Make save status explicit and await backend persistence for high-impact operations (members, units, accounting, communications); do not show “saved/sent” until server confirmation.
- Do not blanket-clear all browser storage on logout until every key's ownership and offline-retention behavior is mapped. Clear only scoped session data and reset in-memory domain state after a deliberate product decision.
- Add tests for empty storage, stale cache, failed/slow hydration, same-role workspace switch, logout/login, delayed response ordering, and failed writes.

## Verification gate

Before implementing, map all `KEYS` usages and state setters, especially backup/import/export and offline/demo flows. Implement in a small isolated branch commit, then run the build and automated tests against that exact SHA. Backend and identity isolation must then be tested with synthetic users/workspaces in an isolated database. Do not use production for test identities or mutations.

## Status

**Static review complete; fix not applied; runtime behavior unverified.** No production database changes, migrations, Edge Function invocations, emails, or deployments occurred. Existing QA certification remains blocked.


## Additional render-gate finding (batch 27 follow-up)

The app returns `PublicHome` only while `sessionRole` is falsy. Once an authenticated role is set, the main application renders immediately; the separate backend hydration effect then runs asynchronously. The render path inspected does not additionally require a successful hydration flag. Consequently, authenticated dashboard rendering can begin with the state initialized from global local-storage keys or fixture arrays, before the workspace data fetch completes. This establishes a concrete stale/fixture-render window in the source flow, though it does not establish that a particular user's data was exposed or synced. The background sync has its own `backendHydrated.current` gate, but that does not itself prevent initial rendering. A future fix should gate authenticated manager views on a matching identity/workspace hydration state, not simply add a delay or clear storage.


## Persistence-effect ordering — final static check

The domain state hooks initialize synchronously from `load(KEYS.*, initial*Array)`, and the reviewed persistence effects are ordinary React effects that serialize state when their dependencies change. They are not uniformly guarded by an authenticated hydration-ready condition. Therefore initial fixture/cache values may be written back to the global local-storage keys on mount, before the asynchronous backend hydration completes. This makes “just hide the dashboard until hydration” insufficient by itself: the fix must also suppress pre-hydration persistence and prevent stale state from being treated as a new workspace write. This is a source-level ordering risk; no runtime trace was collected.

### Implementation hold point

A safe change now requires updating the initialization and persistence lifecycle together, not only adding a render conditional. Because `src/main.tsx` is a 583 KB single-file application and no local test toolchain (test/lint/typecheck scripts, lockfile, or tsconfig in the reviewed branch) is established, this audit does not make a speculative bulk edit. The current GitHub checks provide no status for the documentation commit, so the source change would have no verified build/test result at this point. Keep this finding as a code-change prerequisite; do not call it fixed.
