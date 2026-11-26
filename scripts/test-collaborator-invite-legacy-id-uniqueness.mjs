import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  cleanupCollaboratorInviteLegacyConflict,
  cleanupUnlinkedCollaboratorInvite,
  isWorkspaceMemberLegacyIdConflict,
} from "../supabase/functions/_shared/workspace-member-legacy-id-conflict.js";

const indexSource = await readFile(
  "supabase/migrations/20261017000002_bethag_baseline_indexes_views.sql",
  "utf8",
);
const edgeSource = await readFile(
  "supabase/functions/bethag-invite-collaborator/index.ts",
  "utf8",
);
assert.match(
  indexSource,
  /CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique[\s\S]*?ON public\.workspace_members[\s\S]*?\(workspace_id, legacy_id\)[\s\S]*?WHERE \(legacy_id IS NOT NULL\)/,
  "the canonical baseline already owns the workspace legacy identity unique index",
);

const db = new PGlite();
try {
  await db.exec(`
    CREATE TABLE auth_users(id uuid PRIMARY KEY, email text NOT NULL);
    CREATE TABLE profiles(
      id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      email text NOT NULL,
      role text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE workspace_members(
      workspace_id uuid NOT NULL,
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role text NOT NULL,
      legacy_id bigint,
      PRIMARY KEY(workspace_id, user_id)
    );
    CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique
      ON workspace_members(workspace_id, legacy_id)
      WHERE legacy_id IS NOT NULL;
  `);

  await db.exec(`
    INSERT INTO auth_users(id,email) VALUES
      ('00000000-0000-0000-0000-000000000011','one@example.invalid'),
      ('00000000-0000-0000-0000-000000000012','two@example.invalid');
    INSERT INTO profiles(id,full_name,email,role) VALUES
      ('00000000-0000-0000-0000-000000000011','One','one@example.invalid','collaborator'),
      ('00000000-0000-0000-0000-000000000012','Two','two@example.invalid','collaborator');
    INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id)
      VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','collaborator',7001);
  `);

  await assert.rejects(
    db.query(
      "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
      ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000012"],
    ),
    (error) => String(error.code) === "23505"
      && String(error.message).includes("workspace_members_workspace_legacy_unique"),
    "the canonical index must reject a second user claiming the same workspace legacy ID",
  );

  const orphanBeforeCleanup = await db.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id = $1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id = $1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000012"],
  );
  assert.equal(orphanBeforeCleanup.rows[0].auth_count, 1);
  assert.equal(orphanBeforeCleanup.rows[0].profile_count, 1);
  console.log("PASS baseline reproduction: the existing unique index rejects the second membership after its Auth user/profile have already been created.");

  const cleanup = await cleanupCollaboratorInviteLegacyConflict(
    {
      auth: {
        admin: {
          async deleteUser(id) {
            await db.query("DELETE FROM auth_users WHERE id = $1", [id]);
            return { error: null };
          },
        },
      },
    },
    "00000000-0000-0000-0000-000000000012",
    { invited: true, profileCreated: false },
  );
  assert.deepEqual(cleanup, { failed: false, action: "delete_auth_user" });
  const orphanAfterCleanup = await db.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id = $1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id = $1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000012"],
  );
  assert.equal(orphanAfterCleanup.rows[0].auth_count, 0);
  assert.equal(orphanAfterCleanup.rows[0].profile_count, 0);

  await db.exec(`
    INSERT INTO auth_users(id,email) VALUES
      ('00000000-0000-0000-0000-000000000013','three@example.invalid'),
      ('00000000-0000-0000-0000-000000000014','four@example.invalid');
    INSERT INTO profiles(id,full_name,email,role) VALUES
      ('00000000-0000-0000-0000-000000000013','Three','three@example.invalid','collaborator'),
      ('00000000-0000-0000-0000-000000000014','Four','four@example.invalid','collaborator');
  `);
  await db.query(
    "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
    ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000013"],
  );
  await db.query(
    "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',NULL),($1,$3,'collaborator',NULL)",
    ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000013", "00000000-0000-0000-0000-000000000014"],
  );
  console.log("PASS cleanup and scope: losing invited Auth user/profile removed; same legacy ID in another workspace and NULL IDs remain valid.");
} finally {
  await db.close();
}

const duplicateError = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_workspace_legacy_unique"',
};
assert.equal(isWorkspaceMemberLegacyIdConflict(duplicateError), true);
assert.equal(isWorkspaceMemberLegacyIdConflict({
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_pkey"',
}), false);
assert.equal(isWorkspaceMemberLegacyIdConflict({ code: "23503", message: "foreign key violation" }), false);

const cleanupCalls = [];
const profileCleanup = await cleanupCollaboratorInviteLegacyConflict(
  { from(table) { assert.equal(table, "profiles"); return { delete() { return { async eq(column, value) { cleanupCalls.push(["deleteProfile", column, value]); return { error: null }; } }; } }; } },
  "auth-user-existing",
  { invited: false, profileCreated: true },
);
assert.deepEqual(profileCleanup, { failed: false, action: "delete_created_profile" });
assert.deepEqual(cleanupCalls, [["deleteProfile", "id", "auth-user-existing"]]);

const noCleanup = await cleanupCollaboratorInviteLegacyConflict({}, "existing-user", {
  invited: false,
  profileCreated: false,
});
assert.deepEqual(noCleanup, { failed: false, action: "none" });

const genericFailureDb = new PGlite();
try {
  await genericFailureDb.exec(`
    CREATE TABLE auth_users(id uuid PRIMARY KEY, email text NOT NULL);
    CREATE TABLE profiles(
      id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      email text NOT NULL,
      role text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE workspace_members(
      workspace_id uuid NOT NULL,
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role text NOT NULL,
      legacy_id bigint,
      PRIMARY KEY(workspace_id, user_id),
      CONSTRAINT reject_legacy_id_7002 CHECK (legacy_id <> 7002)
    );
    INSERT INTO auth_users(id,email)
      VALUES ('00000000-0000-0000-0000-000000000022','orphan@example.invalid');
    INSERT INTO profiles(id,full_name,email,role)
      VALUES ('00000000-0000-0000-0000-000000000022','Orphan','orphan@example.invalid','collaborator');
  `);
  await assert.rejects(
    genericFailureDb.query(
      "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7002)",
      ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000022"],
    ),
    (error) => String(error.code) === "23514",
    "a non-unique workspace membership write failure must be reproduced",
  );
  const orphanBefore = await genericFailureDb.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id=$1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id=$1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000022"],
  );
  assert.deepEqual(orphanBefore.rows[0], { auth_count: 1, profile_count: 1 });
  console.log("PASS baseline reproduction: generic workspace_members failure leaves the newly invited Auth user and profile orphaned before compensation.");

  const genericCleanup = await cleanupUnlinkedCollaboratorInvite(
    {
      auth: {
        admin: {
          async deleteUser(id) {
            await genericFailureDb.query("DELETE FROM auth_users WHERE id=$1", [id]);
            return { error: null };
          },
        },
      },
    },
    "00000000-0000-0000-0000-000000000022",
    { invited: true, profileCreated: true, workspaceMemberLinked: false },
  );
  assert.deepEqual(genericCleanup, { failed: false, action: "delete_auth_user" });
  const orphanAfter = await genericFailureDb.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id=$1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id=$1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000022"],
  );
  assert.deepEqual(orphanAfter.rows[0], { auth_count: 0, profile_count: 0 });
  console.log("PASS compensation: failed collaborator membership write removes only the newly invited Auth user and cascaded profile.");
} finally {
  await genericFailureDb.close();
}

const failedDelete = await cleanupUnlinkedCollaboratorInvite(
  { auth: { admin: { async deleteUser() { return { error: new Error("Auth cleanup unavailable") }; } } } },
  "new-auth-user",
  { invited: true, profileCreated: true, workspaceMemberLinked: false },
);
assert.deepEqual(failedDelete, { failed: true, action: "delete_auth_user" });

let linkedDeleteCalled = false;
const linkedStateCleanup = await cleanupUnlinkedCollaboratorInvite(
  { auth: { admin: { async deleteUser() { linkedDeleteCalled = true; return { error: null }; } } } },
  "linked-auth-user",
  { invited: true, profileCreated: true, workspaceMemberLinked: true },
);
assert.deepEqual(linkedStateCleanup, { failed: false, action: "none" });
assert.equal(linkedDeleteCalled, false, "a linked workspace member must never be deleted by compensation");

const missingIdCleanup = await cleanupUnlinkedCollaboratorInvite(
  {},
  null,
  { invited: true, profileCreated: false, workspaceMemberLinked: false },
);
assert.deepEqual(missingIdCleanup, { failed: true, action: "delete_auth_user_unavailable" });

assert.match(edgeSource, /isWorkspaceMemberLegacyIdConflict/);
assert.match(edgeSource, /cleanupUnlinkedCollaboratorInvite/);
assert.match(edgeSource, /COLLABORATOR_LEGACY_ID_ALREADY_ASSIGNED/);
assert.match(edgeSource, /invitationSent: invited/);
assert.match(edgeSource, /workspaceMemberLinked = true/);
assert.match(edgeSource, /cleanupAttempted/);
assert.match(edgeSource, /cleanupFailed/);
assert.match(edgeSource, /invitationAccountRemoved/);
assert.match(edgeSource, /failureStage/);
assert.match(edgeSource, /if \(!workspaceMemberLinked && \(invited \|\| profileCreated\)\)/);
const conflictIndex = edgeSource.indexOf("isWorkspaceMemberLegacyIdConflict(upsertError)");
const successIndex = edgeSource.indexOf("return json({ success: true, userId: targetUserId, invited })");
assert.ok(conflictIndex >= 0 && successIndex > conflictIndex, "the unique conflict must be handled before success is returned");

console.log("PASS collaborator invitation runtime: the existing canonical unique conflict maps to HTTP 409 and cleans up only the losing Auth/profile record.");
