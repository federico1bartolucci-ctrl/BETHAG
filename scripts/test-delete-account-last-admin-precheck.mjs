import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { hasLastActiveWorkspaceAdmin } from "../supabase/functions/_shared/last-admin-precheck.js";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261126052000_last_admin_precheck_single_statement.sql";
const migration = await readFile(migrationPath, "utf8");
const handler = await readFile("supabase/functions/delete-account/index.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(packageJson.scripts.test, /test-delete-account-last-admin-precheck\.mjs/,
  "The single-statement last-admin regression must run in npm test.");
assert.equal(
  (handler.match(/hasLastActiveWorkspaceAdmin\(ctx\.supabaseAdmin, userId\)/g) ?? []).length,
  2,
  "Both pre-delete and post-failure checks must use the same SQL snapshot RPC.",
);
assert.doesNotMatch(handler, /listActiveAdminMemberships|from\(["']workspace_members["']\)/,
  "The Edge Function must not perform a multi-request membership scan.");
assert.match(migration, /SECURITY DEFINER/);
assert.match(migration, /SET search_path TO ''/);
assert.match(migration, /NOT EXISTS/);
assert.match(migration, /REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO service_role/);

const rpcCalls = [];
const rpcClient = {
  async rpc(name, args) {
    rpcCalls.push({ name, args });
    return { data: true, error: null };
  },
};
assert.equal(await hasLastActiveWorkspaceAdmin(rpcClient, "20000000-0000-4000-8000-000000000001"), true);
assert.deepEqual(rpcCalls, [{
  name: "has_last_active_workspace_admin",
  args: { p_user_id: "20000000-0000-4000-8000-000000000001" },
}]);
await assert.rejects(
  () => hasLastActiveWorkspaceAdmin({ rpc: async () => ({ data: null, error: null }) }, "user-1"),
  /definitive boolean/,
);
await assert.rejects(
  () => hasLastActiveWorkspaceAdmin({ rpc: async () => ({ data: null, error: { message: "RPC unavailable" } }) }, "user-1"),
  /RPC unavailable/,
);
await assert.rejects(
  () => hasLastActiveWorkspaceAdmin({}, "user-1"),
  /RPC client/,
);
await assert.rejects(
  () => hasLastActiveWorkspaceAdmin(rpcClient, " "),
  /valid user ID/,
);

// Reproduce the offset-pagination race: one membership is removed and a new
// one appended between pages. The exact count stays 1,205, but the offset scan
// returns a mixed set, omits workspace-00501 and includes workspace-01206.
const initialRows = Array.from({ length: 1205 }, (_, index) => ({
  workspace_id: "workspace-" + String(index + 1).padStart(5, "0"),
}));
let liveRows = initialRows.slice();
const exactCountAtFirstPage = liveRows.length;
const legacyRows = [];
for (let offset = 0, page = 0; offset < exactCountAtFirstPage; offset += 500, page += 1) {
  if (page === 1) {
    liveRows = liveRows.filter((row) => row.workspace_id !== "workspace-00501");
    liveRows.push({ workspace_id: "workspace-01206" });
    liveRows.sort((left, right) => left.workspace_id.localeCompare(right.workspace_id));
  }
  legacyRows.push(...liveRows.slice(offset, offset + 500));
}
assert.equal(liveRows.length, exactCountAtFirstPage, "The concurrent replacement must preserve the exact count.");
assert.equal(legacyRows.length, exactCountAtFirstPage);
assert.equal(new Set(legacyRows.map((row) => row.workspace_id)).size, exactCountAtFirstPage);
assert.equal(legacyRows.some((row) => row.workspace_id === "workspace-00501"), false);
assert.equal(legacyRows.some((row) => row.workspace_id === "workspace-01206"), true);

// Execute the replacement SQL function against a database containing more
// than two PostgREST pages. The result is one SQL statement snapshot, not a
// client-side offset scan.
const db = new PGlite();
try {
  await db.exec([
    "CREATE ROLE anon;",
    "CREATE ROLE authenticated;",
    "CREATE ROLE service_role;",
    "CREATE TABLE public.workspace_members (",
    "  workspace_id uuid NOT NULL,",
    "  user_id uuid NOT NULL,",
    "  role text NOT NULL,",
    "  active boolean NOT NULL DEFAULT true,",
    "  PRIMARY KEY (workspace_id, user_id)",
    ");",
  ].join("\n"));
  await db.exec(migration);

  await db.exec(
    "INSERT INTO public.workspace_members (workspace_id, user_id, role, active) " +
    "SELECT ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, " +
    "'20000000-0000-4000-8000-000000000001'::uuid, 'admin', true " +
    "FROM generate_series(1, 1205) AS i;"
  );
  await db.exec(
    "INSERT INTO public.workspace_members (workspace_id, user_id, role, active) " +
    "SELECT workspace_id, '20000000-0000-4000-8000-000000000002'::uuid, 'admin', true " +
    "FROM public.workspace_members " +
    "WHERE user_id = '20000000-0000-4000-8000-000000000001'::uuid " +
    "AND workspace_id <> '10000000-0000-4000-8000-000000000501'::uuid;"
  );

  const lastAdmin = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000001"],
  );
  assert.equal(lastAdmin.rows[0].result, true,
    "A last-admin workspace beyond the first two pages must be detected.");

  const coAdmin = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000002"],
  );
  assert.equal(coAdmin.rows[0].result, false,
    "A user who has another active admin in every membership must not be blocked.");

  await db.exec(
    "INSERT INTO public.workspace_members (workspace_id, user_id, role, active) VALUES " +
    "('10000000-0000-4000-8000-000000001206', '20000000-0000-4000-8000-000000000003', 'admin', true), " +
    "('10000000-0000-4000-8000-000000001207', '20000000-0000-4000-8000-000000000004', 'admin', false), " +
    "('10000000-0000-4000-8000-000000001208', '20000000-0000-4000-8000-000000000005', 'collaborator', true);"
  );
  const isolatedAdmin = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000003"],
  );
  assert.equal(isolatedAdmin.rows[0].result, true);
  const inactiveAdmin = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000004"],
  );
  assert.equal(inactiveAdmin.rows[0].result, false);
  const collaborator = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000005"],
  );
  assert.equal(collaborator.rows[0].result, false);

  const acl = await db.query(
    "SELECT " +
    "has_function_privilege('service_role', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE') AS service_can_check, " +
    "has_function_privilege('authenticated', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE') AS authenticated_can_check, " +
    "has_function_privilege('anon', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE') AS anon_can_check"
  );
  assert.equal(acl.rows[0].service_can_check, true);
  assert.equal(acl.rows[0].authenticated_can_check, false);
  assert.equal(acl.rows[0].anon_can_check, false);

  await db.exec("SET ROLE service_role;");
  const serviceResult = await db.query(
    "SELECT public.has_last_active_workspace_admin($1) AS result",
    ["20000000-0000-4000-8000-000000000003"],
  );
  await db.exec("RESET ROLE;");
  assert.equal(serviceResult.rows[0].result, true);

  console.log("Delete-account last-admin consistent-snapshot runtime regression: PASS");
  console.log("Legacy same-count offset-pagination race reproduced: PASS");
  console.log("Single-statement SQL precheck detects last-admin membership beyond page limits: PASS");
  console.log("Service-role-only RPC grants and Edge Function wiring: PASS");
} finally {
  await db.close();
}
