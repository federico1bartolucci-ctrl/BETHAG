import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildMemberOwnerReferenceSaveArgs } from "../src/lib/memberOwnerReferenceSync.mjs";
const member={id:12345,role:"Proprietario",active:true,currentOwner:true,positionStatus:"Attivo",data:{ownership_share:"50"}};
const row={user_id:null,name:"Ada Lovelace",email:"ada@example.invalid",role:"resident",active:true,permissions:{},data:member};
const args=buildMemberOwnerReferenceSaveArgs({workspaceId:"w",condominiumId:"c",unitId:"u",member,row});
assert.equal(args.p_legacy_id,"12345");
assert.equal(args.p_unit_id,"u");
assert.deepEqual(args.p_data,member);
assert.throws(()=>buildMemberOwnerReferenceSaveArgs({workspaceId:"",condominiumId:"c",unitId:"u",member,row}),/Contesto/);
const [backend,sql,shell,pkg]=await Promise.all([
 readFile("src/lib/bethagBackend.ts","utf8"),
 readFile("supabase/rebuild/proposed-forward-migrations/20261127060000_atomic_condominium_member_owner_reference_sync.sql","utf8"),
 readFile("scripts/test-member-owner-reference-concurrency.sh","utf8"),
 readFile("package.json","utf8").then(JSON.parse)
]);
assert.match(backend,/save_condominium_member_with_owner_sync/);
assert.doesNotMatch(backend,/syncMemberOwnerReferences\(supabase/);
assert.match(sql,/INSERT INTO public\.condominium_members[\s\S]*ON CONFLICT[\s\S]*sync_condominium_member_owner_references/);
assert.match(sql,/pg_advisory_xact_lock/);
assert.match(sql,/SECURITY INVOKER/);
assert.match(shell,/ATOMIC SAVE ROLLBACK VERIFIED/);
assert.match(pkg.scripts.test,/test-member-owner-reference-sync-runtime\.mjs/);
console.log("PASS: atomic member-save RPC runtime contract.");
