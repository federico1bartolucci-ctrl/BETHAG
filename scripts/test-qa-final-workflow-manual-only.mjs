import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");

assert.doesNotMatch(workflow, /^  pull_request:/m,
  "Authenticated final QA must not run automatically on pull requests.");
assert.match(workflow, /^  workflow_dispatch:/m,
  "Final QA must remain explicitly dispatchable when separately authorized.");
assert.match(workflow, /^      target_ref:/m,
  "Manual Final QA must require an exact target SHA.");
assert.match(workflow, /^        required: true$/m,
  "Manual Final QA target SHA must be required.");
assert.doesNotMatch(workflow, /^        default:/m,
  "Manual Final QA must not silently select a stale default SHA.");
assert.match(workflow, /^    if: github\.event_name == 'workflow_dispatch'$/m,
  "The Final QA job must be gated to explicit manual dispatch.");
assert.match(workflow, /^          ref: \$\{\{ inputs\.target_ref \}\}$/m,
  "Final QA must check out the exact operator-supplied SHA.");
assert.match(workflow, /test "\$ACTUAL_SHA" = "\$EXPECTED_SHA"/,
  "Final QA must verify the checked-out SHA before running authenticated tests.");
assert.doesNotMatch(workflow, /github\.head_ref/,
  "A pull-request branch name must not activate the shared QA workflow.");

console.log(JSON.stringify({
  status: "PASS",
  automatic_pull_request_final_qa: "DISABLED",
  manual_exact_sha_dispatch: "REQUIRED",
  shared_qa_mutation_from_pr_sync: "BLOCKED"
}, null, 2));
