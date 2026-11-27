# Atomic condominium member owner-reference synchronization

## Finding
Concurrent saves in separate browser sessions could overwrite each other's `ownerMemberIds` because each session performed an independent client-side read/modify/write. The in-memory queue serialized only one JavaScript runtime.

## Correction
A PostgreSQL invoker-security RPC locks affected unit rows in deterministic UUID order, re-reads the JSONB state after lock acquisition, and merges/removes only the member's legacy ID. It preserves unrelated unit metadata and other owners. Workspace and condominium scope are checked; the existing RLS manager policies remain authoritative.

## Regression coverage
- Unit-level runtime tests validate owner eligibility, fail-closed RPC responses, and production wiring.
- PostgreSQL 17 rehearsal first reproduces the legacy last-writer-wins defect, then runs two simultaneous RPC calls behind a held unit-row lock and verifies both co-owners remain.
- The RPC concurrency calls execute as the `authenticated` role with a synthetic admin workspace membership, so function grants and RLS policies are exercised rather than bypassed as postgres.
- The PostgreSQL test refuses remote URLs and is restricted to the disposable local `bethag_clean_install_test` database.

## Migration gate
The SQL remains under `supabase/rebuild/proposed-forward-migrations`. It is not part of the frozen canonical migration sequence. Do not merge the application caller or deploy the function until the canonical migration ledger, cutover manifest, clean-install rehearsal, and release fingerprint have been explicitly reconciled.

## Safety
No QA/Production access or writes, no database deployment, no reset, and no paid services.


## Member deletion interleaving

A second race remained after serializing concurrent owner saves: \`deleteCondominiumMember()\` still performed a client-side read/modify/write of \`ownerMemberIds\` after deleting the member. A concurrent owner save could commit first, then the stale delete snapshot could overwrite the newly added co-owner. The same path also deleted \`portal_access\` before the database's financial-history DELETE guard ran, so a blocked member deletion could revoke access prematurely.

The corrected client path performs one scoped \`condominium_members\` DELETE and verifies the returned row. The existing BEFORE DELETE financial-history guard and AFTER DELETE Portal/owner-reference triggers execute in the same database transaction. Client-side Portal deletion and unit JSONB cleanup are removed.

The PostgreSQL 17 rehearsal now:
- reproduces the old delete-vs-owner-save lost-update race;
- runs an authenticated member DELETE trigger concurrently with the row-locked owner-sync RPC;
- verifies that the deleted member is absent and the surviving co-owner remains in \`ownerMemberIds\`.

The test remains restricted to the disposable local \`bethag_clean_install_test\` database.
