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

const [backend, migration, packageJson] = await Promise.all([
  readFile("src/lib/bethagBackend.ts", "utf8"),
  readFile("supabase/rebuild/proposed-forward-migrations/20261127060000_atomic_condominium_member_owner_reference_sync.sql", "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
]);
assert.match(backend, /buildMemberOwnerReferenceSyncArgs/);
assert.match(backend, /syncMemberOwnerReferences\(supabase, ownerSyncArgs\)/);
assert.doesNotMatch(backend, /ownerSyncError/);
assert.match(migration, /FOR UPDATE/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /REVOKE ALL ON FUNCTION/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated/);
assert.match(packageJson.scripts.test, /test-member-owner-reference-sync-runtime\.mjs/);

console.log("PASS: member owner-reference sync arguments, fail-closed RPC handling, production wiring and SQL lock/ACL contract.");
