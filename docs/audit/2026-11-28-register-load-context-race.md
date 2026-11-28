# Register workspace/condominium stale-load isolation

Date: 2026-11-28

## Finding

`RegisterPage` loaded items, suppliers, works, documents, funds and SAL rows after resolving the selected condominium. The effect ran for `workspaceId` and `selected` changes but had no cancellation or request-generation guard.

If a request for workspace A remained pending while the user switched to workspace B, the older A request could complete last and overwrite component state after B had become current. The same race could let an older condominium resolver replace `dbId` after a newer selection.

## Correction

- Assign a monotonically increasing request ID to every Register load.
- Pass the request ID into condominium resolution and guard its `dbId` update.
- Discard stale list responses before writing any collection state.
- Guard error and loading updates so an old request cannot replace the current request's UI state.
- Invalidate outstanding requests on effect cleanup/unmount.
- Associate loaded data with the exact `[workspaceId, selected]` context and hide the previous context while the new one is loading or has failed.

No database schema or migration changes are required.

## Regression

`scripts/test-register-load-context-race.mjs` covers:
- current versus stale request generations;
- an older workspace response resolving after a newer workspace response;
- request-generation wiring in `RegisterPage`;
- stale resolver, list, error and loading guards;
- effect cleanup invalidation;
- context-key UI isolation;
- registration in `npm test`.

## Safety

- Isolated branch from `main` at `27bfe3f5f3a05544009f13e977cfd437dcd327d6`.
- No QA or Production database/Storage access or writes.
- No schema or migration changes.
- No merge, deploy, reset or manual workflow dispatch.
