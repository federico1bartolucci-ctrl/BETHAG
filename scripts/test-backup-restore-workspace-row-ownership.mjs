import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { prepareWorkspaceRowsForBackupRestore } from "../src/lib/backupSecurityRestore.mjs";

const currentWorkspace = "11111111-1111-4111-8111-111111111111";
const foreignWorkspace = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const visibleForeignId = "44444444-4444-4444-8444-444444444444";
const hiddenForeignId = "55555555-5555-4555-8555-555555555555";
const racedId = "66666666-6666-4666-8666-666666666666";

const prepared = prepareWorkspaceRowsForBackupRestore(
  [
    { id: "same-workspace", title: "Updated" },
    { id: visibleForeignId, title: "Forged overwrite" },
    { id: "new-row", title: "New", workspace_id: "forged-workspace" },
    { id: "duplicate", title: "First" },
    { id: "duplicate", title: "Second" },
    { title: "Generated ID" },
  ],
  currentWorkspace,
  [
    { id: "same-workspace", workspace_id: currentWorkspace },
    { id: visibleForeignId, workspace_id: foreignWorkspace },
  ],
);
assert.deepEqual(prepared.updateRows.map((row) => row.id), ["same-workspace"]);
assert.deepEqual(prepared.insertRows.map((row) => row.id ?? null), ["new-row", "duplicate", null]);
assert.equal(prepared.skipped, 2);
assert.ok([...prepared.updateRows, ...prepared.insertRows].every((row) => row.workspace_id === currentWorkspace));

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const security = await readFile(new URL("../supabase/migrations/20261017000004_bethag_baseline_security.sql", import.meta.url), "utf8");
const functions = await readFile(new URL("../supabase/migrations/20261017000003_bethag_baseline_functions.sql", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const workflow = await readFile(new URL("../.github/workflows/build.yml", import.meta.url), "utf8");
const restoreStart = mainSource.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = mainSource.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);
const restore = mainSource.slice(restoreStart, restoreEnd);
assert.ok(restore.includes("prepareWorkspaceRowsForBackupRestore"));
assert.ok(restore.includes('loadPaginatedRowsByInFilter(supabase, table, "id", rowIds, "id")'));
assert.ok(restore.includes(".update(workspaceRow)") && restore.includes('.eq("workspace_id", profile.workspaceId)'));
assert.ok(restore.includes(".insert(prepared.insertRows)"));
assert.ok(!restore.includes(".upsert("), "backup restore must never use ID-only ON CONFLICT updates");
assert.ok(security.includes('CREATE POLICY "authorized managers manage activities"') && security.includes("WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text))"));
assert.ok(functions.includes("wm.workspace_id = target_workspace") && functions.includes("wm.role = 'admin'"));
assert.ok(packageJson.scripts.test.includes("test-backup-restore-workspace-row-ownership.mjs"));
assert.ok(workflow.includes("run: npm test"));

const db = new PGlite();
try {
  await db.exec([
    "CREATE ROLE authenticated",
    "CREATE SCHEMA auth",
    "CREATE SCHEMA private",
    "CREATE TABLE public.workspace_members (workspace_id uuid NOT NULL, user_id uuid NOT NULL, role text NOT NULL, active boolean NOT NULL DEFAULT true)",
    "CREATE TABLE public.activities (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, title text NOT NULL)",
    "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$",
    "CREATE FUNCTION private.can_manage_workspace_module(target_workspace uuid, required_permission text) RETURNS boolean LANGUAGE sql STABLE AS $fn$ SELECT EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = target_workspace AND wm.user_id = auth.uid() AND wm.active = true AND wm.role = 'admin') $fn$",
    "ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY",
    "CREATE POLICY workspace_managers_manage_activities ON public.activities FOR ALL TO authenticated USING (private.can_manage_workspace_module(workspace_id, 'attivita')) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'))",
    "GRANT USAGE ON SCHEMA public, auth, private TO authenticated",
    "GRANT SELECT ON public.workspace_members TO authenticated",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated",
  ].join(";"));
  await db.query("INSERT INTO public.workspace_members(workspace_id,user_id,role,active) VALUES ($1,$3,'admin',true),($2,$3,'admin',true)", [currentWorkspace, foreignWorkspace, userId]);
  await db.query("INSERT INTO public.activities(id,workspace_id,title) VALUES ($1,$2,'foreign original')", [visibleForeignId, foreignWorkspace]);

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.query("INSERT INTO public.activities(id,workspace_id,title) VALUES ($1,$2,'forged restore') ON CONFLICT (id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id, title = EXCLUDED.title", [visibleForeignId, currentWorkspace]);
  await db.exec("RESET ROLE");
  const oldUpsert = await db.query("SELECT workspace_id::text AS workspace_id,title FROM public.activities WHERE id=$1", [visibleForeignId]);
  assert.equal(oldUpsert.rows[0].workspace_id, currentWorkspace, "old ID-only upsert reproduces cross-workspace move");

  await db.query("UPDATE public.activities SET workspace_id=$1,title='foreign original' WHERE id=$2", [foreignWorkspace, visibleForeignId]);
  const visibleGuard = prepareWorkspaceRowsForBackupRestore([{ id: visibleForeignId, title: "forged again" }], currentWorkspace, [{ id: visibleForeignId, workspace_id: foreignWorkspace }]);
  assert.deepEqual(visibleGuard.updateRows, []);
  assert.deepEqual(visibleGuard.insertRows, []);
  assert.equal(visibleGuard.skipped, 1);

  await db.query("INSERT INTO public.activities(id,workspace_id,title) VALUES ($1,$2,'hidden foreign original')", [hiddenForeignId, foreignWorkspace]);
  await db.query("UPDATE public.workspace_members SET active=false WHERE workspace_id=$1 AND user_id=$2", [foreignWorkspace, userId]);
  await db.exec("SET ROLE authenticated");
  const hiddenSelect = await db.query("SELECT id FROM public.activities WHERE id=$1", [hiddenForeignId]);
  assert.equal(hiddenSelect.rows.length, 0, "RLS hides the foreign row during preflight");
  const hiddenGuard = prepareWorkspaceRowsForBackupRestore([{ id: hiddenForeignId, title: "forged hidden overwrite" }], currentWorkspace, []);
  assert.equal(hiddenGuard.insertRows.length, 1);
  await assert.rejects(
    db.query("INSERT INTO public.activities(id,workspace_id,title) VALUES ($1,$2,$3)", [hiddenForeignId, currentWorkspace, hiddenGuard.insertRows[0].title]),
    /duplicate key|unique constraint/i,
  );
  await db.exec("RESET ROLE");
  const hiddenAfter = await db.query("SELECT workspace_id::text AS workspace_id,title FROM public.activities WHERE id=$1", [hiddenForeignId]);
  assert.equal(hiddenAfter.rows[0].workspace_id, foreignWorkspace);
  assert.equal(hiddenAfter.rows[0].title, "hidden foreign original");

  await db.query("UPDATE public.workspace_members SET active=true WHERE workspace_id=$1 AND user_id=$2", [foreignWorkspace, userId]);
  await db.query("INSERT INTO public.activities(id,workspace_id,title) VALUES ($1,$2,'race original')", [racedId, currentWorkspace]);
  const raceGuard = prepareWorkspaceRowsForBackupRestore([{ id: racedId, title: "race overwrite" }], currentWorkspace, [{ id: racedId, workspace_id: currentWorkspace }]);
  assert.equal(raceGuard.updateRows.length, 1);
  await db.query("UPDATE public.activities SET workspace_id=$1 WHERE id=$2", [foreignWorkspace, racedId]);
  await db.exec("SET ROLE authenticated");
  const racedUpdate = await db.query("UPDATE public.activities SET title=$1 WHERE id=$2 AND workspace_id=$3 RETURNING id", [raceGuard.updateRows[0].title, racedId, currentWorkspace]);
  assert.equal(racedUpdate.rows.length, 0, "conditional workspace update must not touch a row moved after preflight");
  await db.exec("RESET ROLE");
  const racedAfter = await db.query("SELECT workspace_id::text AS workspace_id,title FROM public.activities WHERE id=$1", [racedId]);
  assert.equal(racedAfter.rows[0].workspace_id, foreignWorkspace);
  assert.equal(racedAfter.rows[0].title, "race original");
} finally {
  await db.close();
}
console.log("Backup restore cross-workspace row ownership regression checks passed.");
