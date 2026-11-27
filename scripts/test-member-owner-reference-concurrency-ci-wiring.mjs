import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [packageJson, workflow, wrapper, shell] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../.github/workflows/build.yml", import.meta.url), "utf8"),
  readFile(new URL("./test-postgres-member-owner-reference-concurrency.mjs", import.meta.url), "utf8"),
  readFile(new URL("./test-member-owner-reference-concurrency.sh", import.meta.url), "utf8"),
]);

assert.ok(packageJson.scripts.test.includes("test-member-owner-reference-sync-runtime.mjs"), "The runtime owner-reference regression must remain in npm test.");
assert.ok(packageJson.scripts.test.includes("test-postgres-member-owner-reference-concurrency.mjs"), "The PostgreSQL owner-reference regression contract must run in npm test.");
assert.ok(packageJson.scripts.test.includes("test-member-owner-reference-concurrency-ci-wiring.mjs"), "The CI wiring regression must run in npm test.");
assert.equal(packageJson.scripts["test:member-owner-reference-concurrency"], "node scripts/test-postgres-member-owner-reference-concurrency.mjs");

const stepStart = workflow.indexOf("- name: Reproduce concurrent condominium member owner-reference writes on isolated PostgreSQL 17");
assert.ok(stepStart >= 0, "The isolated PostgreSQL 17 owner-reference rehearsal step is missing.");
const nextStep = workflow.indexOf("\n      - name:", stepStart + 1);
const step = workflow.slice(stepStart, nextStep < 0 ? workflow.length : nextStep);
assert.ok(step.includes("run: npm run test:member-owner-reference-concurrency"), "The workflow must invoke the guarded Node entry point.");
assert.ok(step.includes("DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bethag_clean_install_test"), "The workflow must target the dedicated local database.");
assert.ok(!step.includes("OWNER_SYNC_TEST_"), "The Node entry point must generate and pass its own isolated fixtures.");
assert.ok(workflow.indexOf("run: npm run test:clean-install") < stepStart, "The owner-reference rehearsal must run after clean-install schema preparation.");

const expectedUrl = "postgresql://postgres:postgres@localhost:5432/bethag_clean_install_test";
assert.ok(wrapper.includes(expectedUrl), "The Node entry point must allowlist the exact local database URL.");
assert.ok(shell.includes("expected_database_url='" + expectedUrl + "'"), "The shell entry point must independently allowlist the exact local database URL.");
const shellGuard = shell.indexOf('if [[ "${DATABASE_URL:-}" != "$expected_database_url" ]]');
const firstPsql = shell.indexOf('psql "$DATABASE_URL"');
assert.ok(shellGuard >= 0 && shellGuard < firstPsql, "The shell database guard must run before any database command.");
assert.ok(shell.includes("fixture IDs already exist"), "The shell must refuse stale fixture collisions before cleanup.");

console.log("Member owner-reference PostgreSQL CI wiring and destructive-fixture safety regression: PASS");
