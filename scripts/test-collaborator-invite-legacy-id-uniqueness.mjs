import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { buildCollaboratorInviteFailureState } from "../supabase/functions/_shared/collaborator-invite-failure-state.js";
import { isWorkspaceMemberLegacyIdConflict } from "../supabase/functions/_shared/workspace-member-legacy-id-conflict.js";

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
  await db.exec([
    "CREATE TABLE auth_users(id uuid PRIMARY KEY, email text NOT NULL);",
    "CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE, full_name text NOT NULL, email text NOT NULL, role text NOT NULL, active boolean NOT NULL DEFAULT true);",
    "CREATE TABLE workspace_members(workspace_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, role text NOT NULL, legacy_id bigint, PRIMARY KEY(workspace_id, user_id), CONSTRAINT reject_legacy_id_7002 CHECK (legacy_id <> 7002));",
    "CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique ON workspace_members(workspace_id, legacy_id) WHERE legacy_id IS NOT NULL;",
    "INSERT INTO auth_users(id,email) VALUES ('00000000-0000-0000-0000-000000000011','one@example.invalid'), ('00000000-0000-0000-0000-000000000012','two@example.invalid'), ('00000000-0000-0000-0000-000000000013','three@example.invalid');",
    "INSERT INTO profiles(id,full_name,email,role) VALUES ('00000000-0000-0000-0000-000000000011','One','one@example.invalid','collaborator'), ('00000000-0000-0000-0000-000000000012','Two','two@example.invalid','collaborator'), ('00000000-0000-0000-0000-000000000013','Three','three@example.invalid','collaborator');",
    "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','collaborator',7001);",
  ].join("\n"));

  await assert.rejects(
    db.query(
      "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7001)",
      ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000012"],
    ),
    (error) => String(error.code) === "23505"
      && String(error.message).includes("workspace_members_workspace_legacy_unique"),
    "the canonical index must reject a second user claiming the same workspace legacy ID",
  );
  const legacyConflictRows = await db.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id=$1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id=$1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000012"],
  );
  assert.deepEqual(legacyConflictRows.rows[0], { auth_count: 1, profile_count: 1 });
  const legacyConflictState = buildCollaboratorInviteFailureState({
    failureStage: "workspace_member_upsert",
    invited: true,
    profileCreated: true,
    workspaceMemberLinked: false,
  });
  assert.deepEqual(legacyConflictState, {
    failureStage: "workspace_member_upsert",
    invitationSent: true,
    profileCreated: true,
    workspaceMemberLinked: false,
    requiresReconciliation: true,
  });
  console.log("PASS baseline reproduction: a legacy-ID conflict occurs after Auth invitation/profile creation; the global Auth identity is preserved and the partial state is explicitly marked for reconciliation.");

  await assert.rejects(
    db.query(
      "INSERT INTO workspace_members(workspace_id,user_id,role,legacy_id) VALUES ($1,$2,'collaborator',7002)",
      ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000013"],
    ),
    (error) => String(error.code) === "23514",
    "a generic membership-write failure must be reproduced",
  );
  const genericFailureRows = await db.query(
    "SELECT (SELECT count(*) FROM auth_users WHERE id=$1)::integer AS auth_count, (SELECT count(*) FROM profiles WHERE id=$1)::integer AS profile_count",
    ["00000000-0000-0000-0000-000000000013"],
  );
  assert.deepEqual(genericFailureRows.rows[0], { auth_count: 1, profile_count: 1 });
  const genericFailureState = buildCollaboratorInviteFailureState({
    failureStage: "workspace_member_upsert",
    invited: true,
    profileCreated: true,
    workspaceMemberLinked: false,
  });
  assert.deepEqual(genericFailureState, {
    failureStage: "workspace_member_upsert",
    invitationSent: true,
    profileCreated: true,
    workspaceMemberLinked: false,
    requiresReconciliation: true,
  });
  console.log("PASS baseline reproduction: generic workspace_members failure leaves the Auth identity/profile present without a membership; response state explicitly requires reconciliation.");
} finally {
  await db.close();
}

const linkedFailureState = buildCollaboratorInviteFailureState({
  failureStage: "profile_update",
  invited: false,
  profileCreated: false,
  workspaceMemberLinked: true,
});
assert.deepEqual(linkedFailureState, {
  failureStage: "profile_update",
  invitationSent: false,
  profileCreated: false,
  workspaceMemberLinked: true,
  requiresReconciliation: true,
});

const noPartialState = buildCollaboratorInviteFailureState({
  failureStage: "request",
  invited: false,
  profileCreated: false,
  workspaceMemberLinked: false,
});
assert.deepEqual(noPartialState, {
  failureStage: "request",
  invitationSent: false,
  profileCreated: false,
  workspaceMemberLinked: false,
  requiresReconciliation: false,
});

const duplicateError = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_workspace_legacy_unique"',
};
assert.equal(isWorkspaceMemberLegacyIdConflict(duplicateError), true);
assert.equal(isWorkspaceMemberLegacyIdConflict({
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspace_members_pkey"',
}), false);
assert.equal(isWorkspaceMemberLegacyIdConflict({ code: "23514", message: "check constraint violation" }), false);

assert.match(edgeSource, /buildCollaboratorInviteFailureState/);
assert.match(edgeSource, /COLLABORATOR_LEGACY_ID_ALREADY_ASSIGNED/);
assert.match(edgeSource, /COLLABORATOR_INVITE_PARTIAL_FAILURE/);
assert.match(edgeSource, /requiresReconciliation/);
assert.match(edgeSource, /invitationSent: true|invitationSent/);
assert.match(edgeSource, /L'invito e-mail potrebbe essere già stato inviato/);

const catchStart = edgeSource.lastIndexOf("} catch (error) {");
assert.ok(catchStart >= 0, "generic catch must exist");
const catchBlock = edgeSource.slice(catchStart);
assert.match(catchBlock, /buildCollaboratorInviteFailureState/);
assert.doesNotMatch(catchBlock, /deleteUser|\.delete\(/, "generic failure must not delete a global Auth user or profile");

const conflictStart = edgeSource.indexOf("if (isWorkspaceMemberLegacyIdConflict(upsertError))");
const successStart = edgeSource.indexOf("return json({ success: true, userId: targetUserId, invited })");
assert.ok(conflictStart >= 0 && successStart > conflictStart, "the unique conflict must be handled before success is returned");
const conflictBlock = edgeSource.slice(conflictStart, successStart);
assert.match(conflictBlock, /buildCollaboratorInviteFailureState/);
assert.doesNotMatch(conflictBlock, /deleteUser|\.delete\(/, "legacy conflict must not delete a potentially shared Auth identity");

console.log("PASS collaborator invitation runtime: generic and unique failures preserve global Auth identities, expose partial state, and require reconciliation.");
