import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildMemberOwnerReferenceSyncArgs,
  syncMemberOwnerReferences,
} from "../src/lib/memberOwnerReferenceSync.mjs";

const base = {
  workspaceId: "workspace-1",
  condominiumId: "condominium-1",
  previousUnitId: "unit-old",
  nextUnitId: "unit-new",
  memberLegacyId: 12345,
  member: {
    role: "Proprietario",
    active: true,
    currentOwner: true,
    positionStatus: "Attivo",
    data: { ownership_share: "50" },
  },
};

const ownerArgs = buildMemberOwnerReferenceSyncArgs(base);
assert.deepEqual(ownerArgs, {
  p_workspace_id: "workspace-1",
  p_condominium_id: "condominium-1",
  p_previous_unit_id: "unit-old",
  p_next_unit_id: "unit-new",
  p_member_legacy_id: "12345",
  p_should_be_owner: true,
});

assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    member: { ...base.member, currentOwner: false },
  }).p_should_be_owner,
  false,
  "An explicitly non-current owner must be removed from unit references."
);
assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    member: { ...base.member, active: false },
  }).p_should_be_owner,
  false,
  "Inactive members must not remain in the current-owner reference list."
);
assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    member: { ...base.member, positionStatus: "Archiviato" },
  }).p_should_be_owner,
  false,
  "Archived members must not remain in the current-owner reference list."
);
assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    member: { ...base.member, data: { ownership_share: "0" } },
  }).p_should_be_owner,
  false,
  "A zero ownership share must not be treated as current ownership."
);
assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    member: { ...base.member, data: { ownership_share: "non numerico" } },
  }).p_should_be_owner,
  true,
  "Non-numeric legacy shares retain the existing UI behavior."
);
assert.equal(
  buildMemberOwnerReferenceSyncArgs({
    ...base,
    previousUnitId: null,
    nextUnitId: null,
    member: { ...base.member, role: "Inquilino" },
  }).p_should_be_owner,
  false
);
assert.throws(
  () => buildMemberOwnerReferenceSyncArgs({ ...base, memberLegacyId: "abc" }),
  /identificativo/
);

let rpcCall;
const result = await syncMemberOwnerReferences({
  rpc: async (name, args) => {
    rpcCall = { name, args };
    return { data: 2, error: null };
  },
}, ownerArgs);
assert.equal(result, 2);
assert.deepEqual(rpcCall, {
  name: "sync_condominium_member_owner_references",
  args: ownerArgs,
});

await assert.rejects(
  () => syncMemberOwnerReferences({
    rpc: async () => ({ data: null, error: { message: "RLS denied" } }),
  }, ownerArgs),
  /RLS denied/
);
await assert.rejects(
  () => syncMemberOwnerReferences({
    rpc: async () => ({ data: null, error: null }),
  }, ownerArgs),
  /risultato valido/
);

const [backend, migration, packageJson, baselineFunctions, baselineSecurity, concurrencyShell] = await Promise.all([
  readFile("src/lib/bethagBackend.ts", "utf8"),
  readFile("supabase/rebuild/proposed-forward-migrations/20261127060000_atomic_condominium_member_owner_reference_sync.sql", "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
  readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8"),
  readFile("supabase/migrations/20261017000004_bethag_baseline_security.sql", "utf8"),
  readFile("scripts/test-member-owner-reference-concurrency.sh", "utf8"),
]);
assert.match(backend, /buildMemberOwnerReferenceSyncArgs/);
assert.match(backend, /syncMemberOwnerReferences\(supabase, ownerSyncArgs\)/);
assert.doesNotMatch(backend, /ownerSyncError/);
assert.match(migration, /FOR UPDATE/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /REVOKE ALL ON FUNCTION/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated/);
assert.match(packageJson.scripts.test, /test-member-owner-reference-sync-runtime\.mjs/);

const deleteStart = backend.indexOf("export async function deleteCondominiumMember(");
const deleteEnd = backend.indexOf("\n\nexport async function storeWorkspaceDocuments(", deleteStart);
assert.notEqual(deleteStart, -1, "Member deletion backend function must exist");
assert.notEqual(deleteEnd, -1, "Member deletion function boundary must be detectable");
const deletion = backend.slice(deleteStart, deleteEnd);
assert.match(deletion, /\.from\("condominium_members"\)\s*\.delete\(\)/);
assert.match(deletion, /\.select\("id"\)/, "Deletion must verify affected rows");
assert.match(deletion, /deletedMemberRows\?\.length/, "Zero-row deletion must fail closed");
assert.doesNotMatch(deletion, /\.from\("portal_access"\)\s*\.delete\(/, "Portal access must not be revoked before the guarded member DELETE");
assert.doesNotMatch(deletion, /\.from\("condominium_units"\)\s*\.update\(/, "Owner references must not be cleaned with a stale client-side JSONB write");
assert.match(baselineFunctions, /CREATE OR REPLACE FUNCTION public\.clean_deleted_member_owner_references\(\)/);
assert.match(baselineFunctions, /SECURITY DEFINER\s+SET search_path TO ''[\s\S]*old\.legacy_id::text/);
assert.match(baselineSecurity, /CREATE TRIGGER trg_clean_deleted_member_owner_references AFTER DELETE ON "public"\."condominium_members"/);
assert.match(concurrencyShell, /LEGACY DELETE RACE REPRODUCED/);
assert.match(concurrencyShell, /PASS: trigger-based member deletion and concurrent owner save preserve the surviving owner/);

console.log("PASS: owner-reference sync and trigger-atomic member deletion runtime contract.");
