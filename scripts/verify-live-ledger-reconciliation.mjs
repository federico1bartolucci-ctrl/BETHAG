import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const report = JSON.parse(await readFile("supabase/rebuild/live-migration-ledger-reconciliation-20261027.json", "utf8"));
const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort();
assert.equal(report.production_unchanged, true, "The captured live ledger report must not imply Production was modified.");
assert.equal(report.canonical_branch_inventory.length, 16, "Expected five baseline files, Production head, and ten incremental migrations.");
assert.equal(files.length, 16, "Canonical migration inventory changed; refresh the release reconciliation.");
const env = Object.fromEntries(report.environments.map((entry) => [entry.name, entry]));
assert.equal(env.production.ledger_count, 244);
assert.equal(env.production.ledger_head.version, "20261022202747");
assert.equal(env.develop.ledger_count, 16);
assert.equal(env.continuity-qa, undefined);
assert.equal(env["continuity-qa"].ledger_count, 18);
assert.equal(env["member-transfer-qa"].ledger_count, 16);
assert.equal(env["migration-reconciliation-qa"].ledger_count, 18);
for (const name of ["develop", "continuity-qa", "member-transfer-qa", "migration-reconciliation-qa"]) {
  assert.ok(env[name].noncanonical_live_entries.length > 0, name + " has environment-specific migration identities requiring effect/source reconciliation.");
}
assert.equal(env.production.canonical_versions_missing.length, 10, "All ten incremental migrations must remain pending in Production until the approved cutover.");
assert.equal(env.production.noncanonical_live_entries.length, 243, "Production's historical ledger is intentionally not rewritten into the clean baseline.");
console.log(JSON.stringify({
  status: "PASS — captured ledger evidence is internally consistent; this does not approve Production execution",
  production: { count: env.production.ledger_count, head: env.production.ledger_head, pendingCanonicalIncrements: env.production.canonical_versions_missing.length },
  qa: Object.fromEntries(["develop", "continuity-qa", "member-transfer-qa", "migration-reconciliation-qa"].map((name) => [name, { count: env[name].ledger_count, head: env[name].ledger_head, environmentSpecificIdentities: env[name].noncanonical_live_entries.length }])),
}, null, 2));
