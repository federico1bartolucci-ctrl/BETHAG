import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isBackupAuthorizationTable,
  prepareCondominiumMembersForBackupRestore,
} from "../src/lib/backupSecurityRestore.mjs";

for (const table of ["workspace_members", "portal_access", "portal_registration_requests"]) {
  assert.equal(isBackupAuthorizationTable(table), true, `${table} must never be replayed from an editable backup`);
}
for (const table of ["condominiums", "condominium_members", "condominium_units", "documents"]) {
  assert.equal(isBackupAuthorizationTable(table), false, `${table} is not an authorization table`);
}

// A forged backup attempts to create a powerful collaborator and to grant
// a resident direct portal access. The restore gate must skip both tables.
const forgedBackup = {
  workspace_members: [{
    workspace_id: "attacker-controlled",
    user_id: "victim-user",
    role: "collaborator",
    active: true,
    permissions: { contabilita: true, condomini: true, documenti: true },
  }],
  portal_access: [{
    workspace_id: "attacker-controlled",
    condominium_id: "condo-a",
    user_id: "victim-user",
    email: "victim@example.test",
    role: "resident",
    active: true,
    permissions: ["documenti", "pagamenti_ordinari", "assemblee"],
  }],
  portal_registration_requests: [{
    workspace_id: "attacker-controlled",
    requested_user_id: "victim-user",
    status: "pending",
  }],
};
const restoreWrites = [];
const skipped = [];
for (const [table, rows] of Object.entries(forgedBackup)) {
  if (isBackupAuthorizationTable(table)) {
    skipped.push(`${table}:${rows.length}`);
    continue;
  }
  restoreWrites.push(table);
}
assert.deepEqual(restoreWrites, []);
assert.deepEqual(skipped, [
  "workspace_members:1",
  "portal_access:1",
  "portal_registration_requests:1",
]);

// Existing member identity, activation, condominium, and role-derived access
// metadata must come from the live row, never from the backup.
const existingMembers = [
  {
    id: "member-existing",
    condominium_id: "condo-a",
    user_id: "verified-user",
    email: "verified@example.test",
    active: false,
    role: "Inquilino",
    permissions: { resident: true },
    data: {
      role: "Inquilino",
      position_status: "Archiviato",
      ownership_share: 100,
      firstName: "Current",
    },
  },
  {
    id: "member-foreign",
    condominium_id: "condo-other-workspace",
    user_id: "foreign-user",
    email: "foreign@example.test",
    active: true,
    role: "Proprietario",
    permissions: { all: true },
    data: { role: "Proprietario" },
  },
];
const prepared = prepareCondominiumMembersForBackupRestore(
  [
    {
      id: "member-existing",
      condominium_id: "condo-a",
      workspace_id: "forged-workspace",
      user_id: "victim-user",
      email: "victim@example.test",
      active: true,
      role: "Proprietario",
      permissions: { all: true },
      data: {
        role: "Proprietario",
        position_status: "In chiusura",
        ownership_share: 0,
        firstName: "Restored",
      },
    },
    {
      id: "member-new",
      condominium_id: "condo-a",
      user_id: "victim-user",
      email: "victim@example.test",
      active: true,
      role: "Proprietario",
      permissions: { all: true },
      data: { role: "Proprietario", firstName: "New" },
    },
    {
      id: "member-foreign",
      condominium_id: "condo-a",
      user_id: "victim-user",
      email: "victim@example.test",
      active: true,
      role: "Proprietario",
      data: { role: "Proprietario" },
    },
    {
      id: "member-outside-backup",
      condominium_id: "condo-not-restored",
      name: "Outside",
    },
  ],
  ["condo-a"],
  existingMembers,
);
assert.equal(prepared.skipped, 2);
assert.equal(prepared.rows.length, 2);

const existing = prepared.rows.find((row) => row.id === "member-existing");
assert.equal(existing.condominium_id, "condo-a");
assert.equal(existing.user_id, "verified-user");
assert.equal(existing.email, "verified@example.test");
assert.equal(existing.active, false);
assert.equal(existing.role, "Inquilino");
assert.deepEqual(existing.permissions, { resident: true });
assert.equal(existing.data.role, "Inquilino");
assert.equal(existing.data.position_status, "Archiviato");
assert.equal(existing.data.ownership_share, 100);
assert.equal(existing.data.firstName, "Restored");
assert.equal(Object.hasOwn(existing, "workspace_id"), false);

const newMember = prepared.rows.find((row) => row.id === "member-new");
assert.equal(newMember.user_id, null);
assert.equal(newMember.email, null);
assert.equal(newMember.active, true);
assert.deepEqual(newMember.permissions, {});
assert.equal(Object.hasOwn(newMember, "workspace_id"), false);

// Verify the real restore handler skips authorization tables before the
// generic upsert and verifies existing member identity before member upsert.
const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const security = await readFile(
  new URL("../supabase/migrations/20261017000004_bethag_baseline_security.sql", import.meta.url),
  "utf8",
);
const functions = await readFile(
  new URL("../supabase/migrations/20261017000003_bethag_baseline_functions.sql", import.meta.url),
  "utf8",
);
const workflow = await readFile(new URL("../.github/workflows/build.yml", import.meta.url), "utf8");

const restoreStart = mainSource.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = mainSource.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace backup restore function must exist");
const restoreFunction = mainSource.slice(restoreStart, restoreEnd);
const authorizationGate = restoreFunction.indexOf("if (isBackupAuthorizationTable(table))");
const genericUpsert = restoreFunction.lastIndexOf('supabase.from(table).upsert(normalized, { onConflict: "id" })');
assert.ok(authorizationGate >= 0 && authorizationGate < genericUpsert, "authorization records must be skipped before generic upsert");
assert.match(restoreFunction, /prepareCondominiumMembersForBackupRestore\s*\(/);
assert.match(restoreFunction, /loadPaginatedRowsByInFilter\(supabase,\s*table,\s*"id",\s*memberIds,\s*"id"\)/);
assert.doesNotMatch(restoreFunction, /\.from\(table\)\s*\.upsert\(normalized,\s*\{\s*onConflict:\s*"workspace_id,user_id"\s*\}\)/);
assert.match(restoreFunction, /skippedSecurityRows\.push\(table \+ ":" \+ rows\.length\)/);
assert.match(restoreFunction, /record di autorizzazione\/workflow/);
assert.ok(packageJson.scripts.test.includes("test-backup-security-restore.mjs"), "security restore regression must run through npm test");
assert.match(workflow, /run:\s*npm test/, "the build workflow must execute npm test");

// Confirm why replaying these rows is security-sensitive in the current schema.
assert.match(security, /CREATE POLICY "admins manage memberships" ON "public"\."workspace_members" AS PERMISSIVE FOR ALL TO "authenticated" USING \(private\.is_workspace_admin\(workspace_id\)\) WITH CHECK \(private\.is_workspace_admin\(workspace_id\)\)/);
assert.match(security, /CREATE POLICY "authorized managers manage portal access"[\s\S]*?private\.can_manage_workspace_module\(workspace_id, 'portale'::text\)/);
const workspaceAccess = functions.slice(
  functions.indexOf("FUNCTION private.can_access_workspace_module"),
  functions.indexOf("FUNCTION private.can_manage_workspace_module"),
);
assert.match(workspaceAccess, /wm\.active = true/);
assert.match(workspaceAccess, /wm\.role = 'collaborator'/);
assert.match(workspaceAccess, /wm\.permissions[\s\S]*?required_permission/);
const residentAccess = functions.slice(
  functions.indexOf("FUNCTION private.can_access_resident_condominium_module"),
  functions.indexOf("FUNCTION private.can_access_workspace_module"),
);
assert.match(residentAccess, /join public\.portal_access pa/);
assert.match(residentAccess, /join public\.condominium_members cm/);
assert.match(residentAccess, /pa\.active = true/);
assert.match(residentAccess, /pa\.user_id = \(select auth\.uid\(\)\)/);

console.log("PASS backup authorization restore guard: access tables skipped; member identity and active state preserved.");
