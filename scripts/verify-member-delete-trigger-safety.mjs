import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const functionsSql = await readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8");
const triggersSql = await readFile("supabase/migrations/20261017000004_bethag_baseline_security.sql", "utf8");

const start = backend.indexOf("export async function deleteCondominiumMember(");
const end = backend.indexOf("\\n\\nexport async function storeCondominiumDocuments(", start);
assert.notEqual(start, -1, "Member deletion backend function must exist");
assert.notEqual(end, -1, "Member deletion function boundary must be detectable");
const deletion = backend.slice(start, end);

assert.match(deletion, /\\.from\\("condominium_members"\\)\\s*\\.delete\\(\\)/, "Deletion must operate on the member table");
assert.match(deletion, /\\.select\\("id"\\)/, "Deletion must verify affected rows");
assert.match(deletion, /deletedMembers\\?\\.length/, "Zero-row deletion must fail closed");
assert.doesNotMatch(deletion, /\\.from\\("portal_access"\\)\\s*\\.delete\\(/, "Portal access must not be deleted before the guarded member delete");
assert.doesNotMatch(deletion, /\\.from\\("condominium_units"\\)\\s*\\.update\\(/, "Unit owner-reference cleanup must not be orchestrated as separate client writes");

assert.match(functionsSql, /CREATE OR REPLACE FUNCTION public\\.clean_deleted_member_owner_references\\(\\)/, "Owner references cleanup trigger function must exist");
assert.match(functionsSql, /CREATE OR REPLACE FUNCTION private\\.sync_portal_after_member_change\\(\\)/, "Portal access sync trigger function must exist");
assert.match(functionsSql, /CREATE OR REPLACE FUNCTION public\\.prevent_member_delete_with_financial_history\\(\\)/, "Financial-history delete guard must exist");
assert.match(triggersSql, /trg_clean_deleted_member_owner_references AFTER DELETE ON "public"\\."condominium_members"/, "Owner cleanup trigger must be AFTER DELETE on member table");
assert.match(triggersSql, /trg_sync_portal_after_member_change AFTER DELETE OR UPDATE OF active, user_id, name, email, data, unit_id, condominium_id ON "public"\\."condominium_members"/, "Portal synchronization trigger must run on member deletion");
assert.match(triggersSql, /trg_prevent_member_delete_with_financial_history BEFORE DELETE ON "public"\\."condominium_members"/, "Financial history guard must run before member deletion");

console.log("Member deletion trigger safety guard: PASS");
