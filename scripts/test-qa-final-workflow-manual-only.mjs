import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");
const lines = workflow.split(/\r?\n/).map(line => line.trim());

assert.ok(!lines.includes("pull_request:"),
  "Authenticated final QA must not run automatically on pull requests.");
assert.ok(lines.includes("workflow_dispatch:"),
  "Final QA must remain explicitly dispatchable when separately authorized.");
assert.ok(lines.includes("target_ref:"),
  "Manual Final QA must require an exact target SHA.");
assert.ok(lines.includes("required: true"),
  "Manual Final QA target SHA must be required.");
assert.ok(!lines.some(line => line.startsWith("default:")),
  "Manual Final QA must not silently select a stale default SHA.");
assert.ok(workflow.includes("if: github.event_name == 'workflow_dispatch'"),
  "The Final QA job must be gated to explicit manual dispatch.");
assert.ok(workflow.includes("ref: ${{ inputs.target_ref }}"),
  "Final QA must check out the exact operator-supplied SHA.");
assert.ok(workflow.includes('test "$ACTUAL_SHA" = "$EXPECTED_SHA"'),
  "Final QA must verify the checked-out SHA before running authenticated tests.");
assert.ok(!workflow.includes("github.head_ref"),
  "A pull-request branch name must not activate the shared QA workflow.");

console.log(JSON.stringify({
  status: "PASS",
  automatic_pull_request_final_qa: "DISABLED",
  manual_exact_sha_dispatch: "REQUIRED",
  shared_qa_mutation_from_pr_sync: "BLOCKED"
}, null, 2));
