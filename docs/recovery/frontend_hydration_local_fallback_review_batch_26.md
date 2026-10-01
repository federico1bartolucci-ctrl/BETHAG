# Frontend hydration and local fallback review — batch 26

Date: 2026-10-01  
Reviewed ref: `bethag-migration-repair`  
Source: `src/main.tsx`, blob `21d8e17a84840f1767cfd704258ad2f7abb7760a`  
Scope: static review only. No application code was changed and no runtime or database tests were performed.

## Findings

### F26-01 — Demo fixtures are the initial fallback for core UI state
The React initializers for condominiums, deadlines, documents, assemblies and other datasets call `load(localStorageKey, initialFixtureArray)`. When local storage has no saved value, demo fixture arrays are rendered as initial state. The source includes sample condominium names/addresses and associated example records.

**Risk / implication:** in a Supabase-configured session, initial render can briefly contain locally cached or fixture state before backend hydration completes. The later hydration replaces state with `loadBackendState(workspaceId)` results, but this transition has not been runtime-verified. Confirm that fixture data cannot be mistaken for persisted customer data, and that logout/account switching cannot expose stale locally cached data.

### F26-02 — Backend hydration failure is logged but not surfaced to the user
The hydration effect catches errors and writes `BETHAG backend hydration failed` to the console. No visible failure state, retry control, or explicit “data not loaded” UI is set in the reviewed block.

**Risk / implication:** a user may see stale local state without a clear indication that current workspace data failed to load. This is a data-integrity and user-confidence risk; static inspection does not establish whether another component surfaces the error.

### F26-03 — Background synchronization is delayed and errors are console-only
After `backendHydrated.current` is true, a 500 ms timeout schedules `syncBackendState`. Rejections are logged to the console. This block does not await persistence before the React state change is reflected in the UI.

**Risk / implication:** visible state can temporarily diverge from server persistence, and a failed write may not be apparent to the user. This aligns with the separately documented communication persistence and send-contract findings; do not treat a UI success state as proof of database persistence without a fetched-back check.

### F26-04 — Hydration is guarded, but session/workspace transitions need runtime coverage
The effect obtains the current auth session, resolves the workspace, loads backend state, checks a cancellation flag, then sets the state and marks hydration complete. The effect dependency list shown is `[sessionRole]`; workspace resolution is based on current profile state and auth session.

**Risk / implication:** login, logout, account switch, workspace switch, delayed network response, and simultaneous state changes need explicit runtime tests to ensure stale responses do not overwrite the active workspace's UI. No race is asserted as proven from static review alone.

## Required tests before launch
- Fresh browser profile with configured backend and empty workspace: no demo records should be represented as persisted records.
- Slow/failing backend hydration: visible loading/error state, retry, no stale-data save.
- Logout and switch between two synthetic workspaces while hydration is delayed: no cross-workspace display or write.
- Create/edit each major record, force network failure, refresh: UI must distinguish saved, pending, and failed persistence.
- Ensure demo fixtures are restricted to an explicitly labelled demo/offline mode, or excluded from configured production sessions.
- Validate all of the above in an isolated environment with synthetic data and role-scoped accounts.

## Disposition
**Static finding; not runtime-tested.** Treat hydration failure visibility, local fallback isolation, and asynchronous persistence feedback as release blockers pending verification and remediation. No production calls, database writes, migrations, Edge Function invocations, emails, or deployments were made.
