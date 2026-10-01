# Local storage key ownership and restore-path inventory — batch 28

Date: 2026-10-01  
Branch: `bethag-migration-repair`  
Source: `src/main.tsx` at blob `21d8e17a84840f1767cfd704258ad2f7abb7760a`.  
Review type: static source inventory only; no code changes or runtime tests.

## Key inventory

The source declares 18 keys. They are global browser keys; none includes a workspace/user suffix in its declared value.

| Key | Declared storage key | Role / initial state |
|---|---|---|
| condominiums | `bethag-condominiums-v5` | Domain data; local cache/fallback to initial fixture array |
| deadlines | `bethag-deadlines-v5` | Domain data; local cache/fallback |
| documents | `bethag-documents-v5` | Domain data; local cache/fallback |
| assemblies | `bethag-assemblies-v5` | Domain data; local cache/fallback |
| suppliers | `bethag-suppliers-v5` | Domain data; local cache/fallback |
| activities | `bethag-activities-v5` | Domain data; local cache/fallback |
| condominiumWorks | `bethag-condominium-works-v1` | Domain data; local cache/fallback |
| communications | `bethag-communications-v1` | Domain data; local cache/fallback |
| condominiumMembers | `bethag-condominium-members-v1` | Domain data; local cache/fallback |
| condominiumRequests | `bethag-condominium-requests-v1` | Domain data; local cache/fallback |
| portalMembers | `bethag-portal-members-v2` | Portal data; local cache/fallback |
| collaborators | `bethag-collaborators-v1` | Workspace role/member presentation data; local cache/fallback |
| profile | `bethag-profile-v5` | User/workspace profile; merged with default profile and generated workspace ID if missing |
| subscription | `bethag-subscription-v2` | Subscription state; local cache/fallback |
| selectedCondominium | `bethag-selected-condominium-v1` | UI selection; persisted/restored by condominium numeric ID |
| page | `bethag-current-page-v1` | UI navigation; persisted and restored |
| session | `bethag-session-v1` | Role hint in non-Supabase mode; Supabase mode initializes role as null |
| sessionEmail | `bethag-session-email-v1` | Local email hint; also written during authenticated sessions |

## Write/read paths observed

- Domain/profile/subscription states initialize through `load(KEYS.*, initialValue)` and have effects that write their serialized state back to `localStorage`.
- Session role/email are written after successful access resolution. Ordinary logout removes session, email and page keys; it does not clear all domain keys in the reviewed logout handler.
- Page is persisted separately and may be restored from local storage.
- Selected condominium is restored only after its persistence-ready condition, matched against loaded condominiums, and removed if the saved numeric ID no longer exists.
- Backup export collects every declared key except session and sessionEmail into `localStorageData`, in addition to the backend export and frontend state.
- Backup restore applies recognized frontend-state properties to React state and local storage. It also iterates the supplied `backup.localStorageData` object, excluding only session and sessionEmail; arbitrary other keys in that object can be written to local storage. A separate backend restore path upserts rows into the currently active workspace. This is a compatibility/security review finding, not evidence of an exploit or successful cross-workspace write.
- Account deletion uses `localStorage.clear()`, which is materially broader than ordinary logout.

## Main risks and boundaries

1. **Identity scope:** domain/profile caches are not visibly namespaced by workspace or user. This alone does not prove disclosure; rendering, hydration, RLS and sync ordering determine effective exposure.
2. **Hydration overwrite:** backend state replaces multiple local React states after asynchronous loading. If it fails, the inspected catch only logs; no explicit error/retry state is established in that effect.
3. **Sync boundary:** background sync is gated by `backendHydrated.current`, workspace and manager role, but this guard is a ref and the hydration effect depends only on `sessionRole`. Same-role workspace transitions need a tested invalidation boundary.
4. **Restore breadth:** restoring arbitrary keys from `localStorageData` can modify local state outside the known key map. A backup must not be treated as a trusted authorization source.
5. **Demo/offline compatibility:** fixture fallbacks and local persistence may be intentional in demo/offline use. Disabling all local storage globally could break those workflows and backups.
6. **Selection collision:** selected condominium is restored by numeric ID. It must be revalidated against the active workspace's loaded condominium list before display or action.

## Recommended implementation design (not applied)

- Introduce an explicit runtime mode: authenticated backend, demo/offline, or unauthenticated entry. Do not infer demo mode solely from an empty backend result or hydration failure.
- In authenticated mode, render a blocking loading state until the identity and workspace have been resolved and backend hydration succeeds. On failure, show an error and retry action; do not silently present fixtures as the account's data.
- Tie each hydration/sync request to an identity + workspace generation token. Invalidate pending work on logout, auth change, workspace change, and component cleanup. Recheck the token immediately before applying loaded state and before syncing.
- On an identity/workspace transition, clear in-memory domain state to neutral loading placeholders before fetching. Do not persist that temporary state to local storage or sync it.
- Keep demo/offline cache behavior isolated behind explicit mode and distinct storage namespace. Do not migrate old global keys automatically until a one-time, user-confirmed mapping can identify their owner/workspace.
- Validate backup format/version, allowlist local keys, reject session/authentication keys and unknown keys, validate workspace binding, and avoid treating backup-supplied role/membership rows as authorization. Restore should show a preview and per-table outcomes.
- Keep logout scoped: invalidate async work, sign out, reset in-memory identity/domain state, remove session/UI keys; retain or remove domain cache only according to explicit mode/retention rules. Avoid blanket `localStorage.clear()` in ordinary logout.
- Do not modify persisted financial or condominium records as part of cache cleanup.

## Focused acceptance tests

| Scenario | Expected behavior |
|---|---|
| Supabase configured, empty browser storage | No demo fixture is presented as authenticated workspace data while hydration is pending |
| Hydration returns valid empty workspace | Empty state shown; fixtures are not injected |
| Hydration fails/network offline | Clear error/retry state; no “ready” indicator and no background sync of stale state |
| User A logs out, user B logs in, same role | A's cached records never render in B's session and are never synced into B's workspace |
| Workspace switches without role change | Old request is invalidated; new workspace hydration runs and only its records are rendered |
| Older hydration resolves after newer one | Older result is ignored |
| Save request fails | UI does not claim durable save; user can retry without duplicate financial operation |
| Backup contains unknown local key or session key | Key is rejected/ignored and reported; no session/auth data is restored |
| Backup restore partially fails | Explicit per-table outcome; no false all-success message |
| Demo/offline mode | Intended local fixtures, local edits and backup flow continue to work in the separate namespace |

## Status

Inventory of all 18 declared keys and main persistence/backup paths is complete for the inspected source blob. This is **not** a full audit of every browser storage API or a runtime test. No code was changed, no migration or database operation was run, no Edge Function was invoked, no email sent, and production was not modified. The next safe code step is to isolate authenticated-mode initialization/hydration in a small change after reviewing every localStorage access and backup compatibility; it must then be built and tested on the exact commit before consideration for release.
