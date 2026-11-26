import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareBackupAdminProfileRestore } from "../src/lib/backupProfileRestoreScope.mjs";

const workspaceA = "11111111-1111-4111-8111-111111111111";
const workspaceB = "22222222-2222-4222-8222-222222222222";
const currentProfile = {
  name: "Amministratore corrente",
  company: "Studio A",
  email: "admin@example.test",
  phone: "111",
  address: "Via A",
  fiscalCode: "RSSMRA00A01H501U",
  vat: "IT00000000000",
  workspaceId: workspaceA,
};

// A backup whose top-level workspace is valid but whose nested profile points
// to another workspace reproduced the old direct setProfile(state.profile).
const forged = prepareBackupAdminProfileRestore(
  { ...currentProfile, name: "Injected", workspaceId: workspaceB },
  workspaceA,
  currentProfile,
);
assert.equal(forged.ok, false, "a foreign nested profile workspace must block the restore");
assert.equal(forged.profile, null);
assert.match(forged.reason, /Nessun dato è stato modificato/);
assert.equal(currentProfile.workspaceId, workspaceA, "the current profile must not be mutated");

const safe = prepareBackupAdminProfileRestore(
  { name: "Studio ripristinato", company: "Studio A", workspaceId: workspaceA, extra: "ignored" },
  workspaceA,
  currentProfile,
);
assert.equal(safe.ok, true);
assert.equal(safe.profile.workspaceId, workspaceA, "the active workspace ID remains authoritative");
assert.equal(safe.profile.name, "Studio ripristinato");
assert.equal(safe.profile.email, currentProfile.email, "omitted identity fields retain current values");
assert.equal("extra" in safe.profile, false, "unknown profile fields are not imported");

const legacyWithoutWorkspaceId = prepareBackupAdminProfileRestore(
  { name: "Profilo legacy" },
  workspaceA,
  currentProfile,
);
assert.equal(legacyWithoutWorkspaceId.ok, true);
assert.equal(legacyWithoutWorkspaceId.profile.workspaceId, workspaceA,
  "legacy profiles without a workspace ID are normalized to the active workspace");

assert.equal(
  prepareBackupAdminProfileRestore(null, workspaceA, currentProfile).profile,
  null,
  "a backup without a frontend profile leaves the current profile untouched",
);
assert.equal(
  prepareBackupAdminProfileRestore([], workspaceA, currentProfile).ok,
  false,
  "array-shaped profile payloads fail closed",
);
assert.equal(
  prepareBackupAdminProfileRestore({ name: { injected: true } }, workspaceA, currentProfile).ok,
  false,
  "non-string profile fields fail closed",
);
assert.equal(
  prepareBackupAdminProfileRestore({ name: "x" }, workspaceB, currentProfile).ok,
  false,
  "the backup top-level workspace must still match the active workspace",
);

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const restoreStart = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = source.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace restore handler must exist");
const handler = source.slice(restoreStart, restoreEnd);

const profilePreflight = handler.indexOf("prepareBackupAdminProfileRestore(");
const firstConfirmation = handler.indexOf("window.confirm(");
const backendRestore = handler.indexOf("const restoreOrder = [");
assert.ok(profilePreflight >= 0, "profile scope preflight must be wired into the restore handler");
assert.ok(profilePreflight < firstConfirmation, "profile scope must be checked before user confirmation");
assert.ok(profilePreflight < backendRestore, "profile scope must be checked before backend writes");
assert.match(handler, /if \(!profileRestore\.ok\)\s*\{\s*alert\(profileRestore\.reason\);\s*return;\s*\}/,
  "a foreign profile must abort the restore before any mutation");
assert.match(handler, /if \(profileRestore\.profile\) setProfile\(profileRestore\.profile as AdminProfile\)/,
  "React must receive only the normalized profile");
assert.match(handler, /localStorage\.setItem\(KEYS\.profile, JSON\.stringify\(profileRestore\.profile\)\)/,
  "the persisted profile must be the normalized profile");
assert.match(handler, /new Set\(\[KEYS\.session, KEYS\.sessionEmail, KEYS\.profile\]\)/,
  "the raw localStorage profile entry must be excluded from generic backup restoration");
assert.doesNotMatch(handler, /setProfile\(state\.profile as AdminProfile\)/,
  "the raw imported profile must never be applied directly");
assert.ok(packageJson.scripts.test.includes("test-backup-profile-workspace-scope.mjs"),
  "the runtime regression must be wired into npm test");

console.log("Workspace backup profile workspace-scope runtime regression: PASS");
