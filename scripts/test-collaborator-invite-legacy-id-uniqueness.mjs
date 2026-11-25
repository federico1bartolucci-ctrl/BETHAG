import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  cleanupCollaboratorInviteLegacyConflict,
  isWorkspaceMemberLegacyIdConflict,
} from "../supabase/functions/_shared/workspace-member-legacy-id-conflict.js";

const migration = await readFile(
  "supabase/rebuild/proposed-forward-migrations/20261125154500_enforce_workspace_member_legacy_id_uniqueness.sql",
  "utf8",
);
const edgeSource = await readFile(
  "supabase/functions/bethag-invite-collaborator/index.ts",
  "utf8",
);

const db = new PGlite();
const tableSql = `
  CREATE TABLE public.workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    legacy_id bigint,
    PRIMARY KEY (workspace_id, user_id)
  );
`;

try {
  await db.exec(tableSql);
  await db.exec(`
    INSERT INTO public.workspace_members(workspace_id,user_id,role,legacy_id) VALUES
      ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','collaborator',7001),
      ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','collaborator',7001);
  `);
  const baseline = await db.query(
    "SELECT count(*)::integer AS count FROM public.workspace_members WHERE workspace_id = $1 AND legacy_id = 7001",
    ["00000000-0000-0000-0000-000000000001"],
  );
  assert.equal(baseline.rows[0].count, 2, "the baseline schema must reproduce two Auth users claiming one collaborator legacy ID");
  console.log("PASS baseline reproduction: two different workspace users can claim the same legacy collaborator ID.");

  await db.exec("BEGIN; SAVEPOINT candidate_preflight;");
  await assert.rejects(
    db.exec(migration),
    /WORKSPACE_MEMBER_LEGACY_ID_DUPLICATES_EXIST/,
    "the candidate migration must refuse to hide pre-existing duplicate identities",
  );
  await db.exec("ROLLBACK TO SAVEPOINT candidate_preflight; RELEASE SAVEPOINT candidate_preflight; COMMIT;");
  const absentIndex = await db.query(
    "SELECT to_regclass('public.workspace_members_workspace_legacy_id_uidx') AS index_name",
  );
  assert.equal(absentIndex.rows[0].index_name, null, "failed preflight must not leave a partial unique index");

  await db.exec("DROP TABLE public.workspace_members;");
  await db.exec(tableSql);
  await db.exec(migration);

  await db.query(
    "INSERT INTO public.workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
    ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000011"],
  );
  await assert.rejects(
    db.query(
      "INSERT INTO public.workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
      ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000012"],
    ),
    (error) => String(error.code) === "23505"
      && String(error.message).includes("workspace_members_workspace_legacy_id_uidx"),
    "the unique index must reject a second Auth user for the same workspace legacy ID",
  );

  await db.query(
    "INSERT INTO public.workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
    ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000013"],
  );
  await db.query(
    "INSERT INTO public.workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',NULL),($1,$3,'collaborator',NULL)",
    ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000014", "00000000-0000-0000-0000-000000000015"],
  );
  console.log("PASS candidate uniqueness: duplicate identity is blocked; another workspace and NULL legacy IDs remain valid.");
} finally {
  await db.close();
}

const duplicateError = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_workspace_legacy_id_uidx"',
};
assert.equal(isWorkspaceMemberLegacyIdConflict(duplicateError), true);
assert.equal(isWorkspaceMemberLegacyIdConflict({
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_pkey"',
}), false);
assert.equal(isWorkspaceMemberLegacyIdConflict({ code: "23503", message: "foreign key violation" }), false);

const cleanupCalls = [];
const invitedCleanup = await cleanupCollaboratorInviteLegacyConflict(
  { auth: { admin: { async deleteUser(id) { cleanupCalls.push(["deleteUser", id]); return { error: null }; } } } },
  "auth-user-new",
  { invited: true, profileCreated: false },
);
assert.deepEqual(invitedCleanup, { failed: false, action: "delete_auth_user" });
assert.deepEqual(cleanupCalls, [["deleteUser", "auth-user-new"]]);

const profileCleanup = await cleanupCollaboratorInviteLegacyConflict(
  { from(table) { assert.equal(table, "profiles"); return { delete() { return { async eq(column, value) { cleanupCalls.push(["deleteProfile", column, value]); return { error: null }; } }; } }; } },
  "auth-user-existing",
  { invited: false, profileCreated: true },
);
assert.deepEqual(profileCleanup, { failed: false, action: "delete_created_profile" });
assert.deepEqual(cleanupCalls[1], ["deleteProfile", "id", "auth-user-existing"]);

const noCleanup = await cleanupCollaboratorInviteLegacyConflict({}, "existing-user", {
  invited: false,
  profileCreated: false,
});
assert.deepEqual(noCleanup, { failed: false, action: "none" });

assert.match(edgeSource, /isWorkspaceMemberLegacyIdConflict/);
assert.match(edgeSource, /cleanupCollaboratorInviteLegacyConflict/);
assert.match(edgeSource, /COLLABORATOR_LEGACY_ID_ALREADY_ASSIGNED/);
assert.match(edgeSource, /invitationSent: invited/);
const conflictIndex = edgeSource.indexOf("isWorkspaceMemberLegacyIdConflict(upsertError)");
const successIndex = edgeSource.indexOf("return json({ success: true, userId: targetUserId, invited })");
assert.ok(conflictIndex >= 0 && successIndex > conflictIndex, "the unique conflict must be handled before success is returned");

console.log("PASS collaborator invitation runtime: unique conflicts map to HTTP 409 and newly created Auth/profile records are cleaned up.");
