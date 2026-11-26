# Audit — Supabase availability and backend payload integrity during workspace restore

## Original finding

`restoreWorkspaceBackup` guarded backend writes with `if (supabase)`, but the final success branch did not distinguish a missing Supabase client. When VITE_SUPABASE_ENABLE=false or the Supabase URL/publishable key is absent, the restore loop is skipped while frontend state/localStorage can still be updated and the UI reports a full restore.

Impact: a backup containing backend rows can appear fully restored even though none of those backend rows were written. The local UI can then diverge from the database.

## Follow-up finding reproduced on the isolated Draft branch

The availability helper normalized a missing or non-object `backup.backend` value to an empty object. It also checked malformed table payloads only when Supabase was unavailable.

The restore loop separately normalizes any non-array table value to an empty array. Therefore:
- a backup with a missing, null, string or array-valued `backend` root could skip every backend table;
- a backup with an object-valued table payload could silently skip that table;
- when Supabase was configured, both paths could proceed to frontend/localStorage commit and the generic full-success message because no backend write error was collected.

These cases are distinct from a valid local-only backup, which must contain an explicit object-valued `backend` section and empty arrays for the restorable tables.

## Correction

- Require `backup.backend` to exist and be a plain object.
- Validate every present restorable table payload as an array, regardless of Supabase availability.
- Validate every row in those arrays as an object before confirmation or mutation.
- Block malformed payloads before user confirmation, React state changes, localStorage writes or backend writes.
- Preserve the existing valid local-only path when Supabase is unavailable and no restorable backend rows are present.
- Preserve the existing behavior for valid configured-backend backups.

## Regression

`scripts/test-backup-restore-requires-supabase.mjs` now covers:
- missing, null, string and array-valued backend roots;
- malformed table payloads with Supabase both configured and unavailable;
- non-object rows in otherwise valid table arrays;
- valid configured-backend and local-only backups;
- preflight ordering before confirmation, React, localStorage and backend writes;
- npm test wiring.

## Safety

The change is isolated on the existing Draft branch for PR #424, which is the direct owner of the Supabase-availability restore preflight. PR #428 and PR #443 remain dependent branches. No QA/Production access or writes, no merge, deploy, reset, or manual workflow dispatch.
