import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const provision = await readFile("scripts/provision-qa-accounts.mjs", "utf8");
const guard = "if (found.user_metadata?.bethag_qa_fixture !== marker)";
const guardIndex = provision.indexOf(guard);
const updateIndex = provision.indexOf("db.auth.admin.updateUserById(found.id");
assert.notEqual(guardIndex, -1, "Existing QA users must be checked for the fixture ownership marker.");
assert.ok(updateIndex > guardIndex, "Ownership guard must execute before password/metadata mutation.");
assert.match(provision, /Refusing to overwrite existing non-fixture QA account/);
assert.match(provision, /bethag_qa_fixture:\s*marker/);

console.log(JSON.stringify({
  qa_account_provisioning_ownership_guard: "PASS",
  existing_non_fixture_accounts_overwritten: false,
  test_scope: "static safety guard; no Supabase calls performed"
}, null, 2));
