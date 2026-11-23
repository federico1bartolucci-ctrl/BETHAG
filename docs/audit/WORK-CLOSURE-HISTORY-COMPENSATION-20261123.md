# Work closure history compensation — 2026-11-23

## Finding
Closing a work updated `condominium_works` to Completed first and then inserted the closure event. If the event insert failed, the work stayed closed while the UI reported an error and history was missing.

## Fix
- Insert the closure history event first.
- If the work status update fails, delete the inserted history event as compensating rollback.
- Surface rollback failure explicitly.
- Scope writes to workspace and add regression guard to npm test.

## Verification
Static source/test/package checks pending re-fetch. No runtime test/CI yet.

## Safety
Draft only; no QA/Production changes, merge, deploy or reset.
