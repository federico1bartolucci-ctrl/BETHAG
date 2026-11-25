import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/production-live-ledger-acl-cutover.yml", "utf8");

assert.match(workflow, /^  workflow_dispatch:/m,
  "Production ACL cutover must be manual-only.");
assert.doesNotMatch(workflow, /^  (pull_request|push):/m,
  "Production ACL cutover must never run automatically from PR or push events.");
assert.match(workflow, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  "Production ACL cutover must be dispatched from main only.");
assert.match(workflow, /expected_commit_sha:[\s\S]*?required: true/,
  "Execution commit SHA must be explicitly supplied.");
assert.match(workflow, /approved_source_commit_sha:[\s\S]*?required: true/,
  "QA-tested source SHA must be explicitly supplied.");
assert.match(workflow, /name: bethag-production-cutover/,
  "Production execution must use the dedicated GitHub Environment.");
assert.match(workflow, /BETHAG_PRODUCTION_DATABASE_URL/,
  "Production database credentials must come only from a GitHub secret.");
assert.match(workflow, /node scripts\/apply-live-ledger-acl-production\.mjs/,
  "The workflow must invoke the dedicated fail-closed Production runner.");
assert.match(workflow, /fetch-depth: 0/,
  "The runner requires full Git history for exact source ancestry checks.");
assert.match(workflow, /persist-credentials: false/,
  "Checkout credentials must not persist into the Production runner.");
assert.match(workflow, /test "\$ACTUAL_SHA" = "\$EXPECTED_COMMIT_SHA"/,
  "The workflow must verify the exact execution checkout.");
assert.match(workflow, /sudo apt-get install --yes postgresql-client/,
  "The GitHub runner must install the PostgreSQL client required by the runner.");
assert.doesNotMatch(workflow, /supabase db push|apply_migration|execute_sql/i,
  "The workflow must not bypass the dedicated transactional runner.");

console.log(JSON.stringify({
  status: "PASS",
  trigger: "MANUAL_ONLY",
  dispatch_ref: "MAIN_ONLY",
  execution: "DEDICATED_FAIL_CLOSED_RUNNER",
  database_secret: "GITHUB_ENVIRONMENT_SECRET",
  automatic_production_writes: false
}, null, 2));
