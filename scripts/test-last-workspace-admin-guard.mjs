import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125084700_guard_last_active_workspace_admin_removal.sql";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-last-workspace-admin-guard\.mjs/, "Last-active-admin regression must be wired into npm test.");

const migration = await readFile(migrationPath, "utf8");
assert.match(migration, /FOR UPDATE/, "Admin removals must serialize on the workspace parent row.");
assert.match(migration, /LAST_ACTIVE_WORKSPACE_ADMIN/, "The guard must expose a stable failure marker.");
assert.match(migration, /BEFORE DELETE ON public\.workspace_members/);
assert.match(migration, /BEFORE UPDATE OF workspace_id, user_id, role, active ON public\.workspace_members/);

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA private;
    CREATE TABLE public.workspaces (
      id uuid PRIMARY KEY
    );
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY
    );
    CREATE TABLE public.workspace_members (
      workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('admin','collaborator','resident','council')),
      active boolean NOT NULL DEFAULT true,
      permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (workspace_id, user_id)
    );
  `);
  await db.exec(migration);

  const ids = {
    w1: "10000000-0000-4000-8000-000000000001",
    a1: "20000000-0000-4000-8000-000000000001",
    b1: "20000000-0000-4000-8000-000000000002",
    r1: "20000000-0000-4000-8000-000000000003",
    w2: "10000000-0000-4000-8000-000000000002",
    a2: "20000000-0000-4000-8000-000000000004",
    b2: "20000000-0000-4000-8000-000000000005",
    w3: "10000000-0000-4000-8000-000000000003",
    a3: "20000000-0000-4000-8000-000000000006"
  };

  await db.exec(`
    INSERT INTO public.workspaces(id) VALUES
      ('${ids.w1}'), ('${ids.w2}'), ('${ids.w3}');
    INSERT INTO public.profiles(id) VALUES
      ('${ids.a1}'), ('${ids.b1}'), ('${ids.r1}'),
      ('${ids.a2}'), ('${ids.b2}'), ('${ids.a3}');
    INSERT INTO public.workspace_members(workspace_id,user_id,role,active) VALUES
      ('${ids.w1}','${ids.a1}','admin',true),
      ('${ids.w1}','${ids.b1}','admin',true),
      ('${ids.w1}','${ids.r1}','resident',true),
      ('${ids.w2}','${ids.a2}','admin',true),
      ('${ids.w2}','${ids.b2}','admin',true),
      ('${ids.w3}','${ids.a3}','admin',true);
  `);

  // Removing one of two admins remains valid.
  await db.exec(`DELETE FROM public.profiles WHERE id='${ids.a1}'`);
  const remainingW1 = await db.query(
    "SELECT count(*)::int AS count FROM public.workspace_members WHERE workspace_id=$1 AND role='admin' AND active",
    [ids.w1]
  );
  assert.equal(remainingW1.rows[0].count, 1);

  async function expectBlocked(sql, label) {
    let error = null;
    try {
      await db.exec(sql);
    } catch (caught) {
      error = caught;
    }
    assert.ok(error, label + " must be blocked.");
    assert.match(String(error.message ?? error), /LAST_ACTIVE_WORKSPACE_ADMIN/, label + " must return the stable guard marker.");
  }

  // The last administrator cannot be deleted, deactivated or demoted.
  await expectBlocked(
    `DELETE FROM public.profiles WHERE id='${ids.b1}'`,
    "Deleting the last active administrator through profile/Auth cascade"
  );
  await expectBlocked(
    `UPDATE public.workspace_members SET active=false WHERE workspace_id='${ids.w1}' AND user_id='${ids.b1}'`,
    "Deactivating the last active administrator"
  );
  await expectBlocked(
    `UPDATE public.workspace_members SET role='collaborator' WHERE workspace_id='${ids.w1}' AND user_id='${ids.b1}'`,
    "Demoting the last active administrator"
  );

  // A non-admin member can still be removed.
  await db.exec(`DELETE FROM public.profiles WHERE id='${ids.r1}'`);
  const residentCount = await db.query(
    "SELECT count(*)::int AS count FROM public.workspace_members WHERE workspace_id=$1 AND user_id=$2",
    [ids.w1, ids.r1]
  );
  assert.equal(residentCount.rows[0].count, 0);

  // A workspace deletion may cascade all its memberships; the guard must not
  // prevent deletion of the parent workspace itself.
  await db.exec(`DELETE FROM public.workspaces WHERE id='${ids.w3}'`);
  const deletedWorkspaceMembers = await db.query(
    "SELECT count(*)::int AS count FROM public.workspace_members WHERE workspace_id=$1",
    [ids.w3]
  );
  assert.equal(deletedWorkspaceMembers.rows[0].count, 0);

  // Removing one admin by role change is valid when another active admin remains.
  await db.exec(`
    UPDATE public.workspace_members
    SET role='collaborator'
    WHERE workspace_id='${ids.w2}' AND user_id='${ids.a2}'
  `);
  const remainingW2 = await db.query(
    "SELECT count(*)::int AS count FROM public.workspace_members WHERE workspace_id=$1 AND role='admin' AND active",
    [ids.w2]
  );
  assert.equal(remainingW2.rows[0].count, 1);
  await expectBlocked(
    `UPDATE public.workspace_members SET active=false WHERE workspace_id='${ids.w2}' AND user_id='${ids.b2}'`,
    "Deactivating the remaining administrator after a valid demotion"
  );

  console.log("Last active workspace administrator guard runtime regression: PASS (profile/Auth cascade, delete, deactivate, demote, resident removal, and workspace cascade).");
} finally {
  await db.close();
}
