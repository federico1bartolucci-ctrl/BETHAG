import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/20261122150000_guard_concurrent_account_deletions_by_admin_reservation.sql", "utf8");
const edge = await readFile("supabase/functions/delete-account/index.ts", "utf8");

assert.match(migration, /account_deletion_admin_reservations/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /count\(DISTINCT r\.user_id\)/);
assert.match(migration, /v_admin_count - v_other_reservations <= 1/);
assert.match(migration, /interval '1 hour'/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.reserve_account_deletion_admins\(uuid\) TO service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.release_account_deletion_admin_reservations\(uuid\) TO service_role/);

assert.match(edge, /rpc\("reserve_account_deletion_admins"/);
assert.match(edge, /rpc\("release_account_deletion_admin_reservations"/);
assert.match(edge, /deleteUser\(userId, false\)/);
assert.ok(edge.indexOf('rpc("reserve_account_deletion_admins"') < edge.indexOf("deleteUser(userId, false)"), "reservation must precede Auth deletion");
assert.ok(edge.indexOf("deleteUser(userId, false)") < edge.lastIndexOf('rpc("release_account_deletion_admin_reservations"'), "release must follow deletion attempt");

console.log("Account deletion admin reservation static verification passed.");
