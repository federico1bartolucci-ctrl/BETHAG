import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");

assert.doesNotMatch(workflow, /^  pull_request:/m,
  "Authenticated Final QA must not run automatically on pull requests.");
assert.match(workflow, /^  workflow_dispatch:/m,
  "Final QA must remain explicitly dispatchable.");
assert.match(workflow, /^      target_ref:/m,
  "Manual Final QA must require an exact target SHA.");
assert.match(workflow, /^        required: true$/m,
  "Manual Final QA target SHA must be required.");
assert.doesNotMatch(workflow, /^        default:/m,
  "Manual Final QA must not silently select a stale default SHA.");
assert.match(workflow, /^permissions:\n  contents: read$/m,
  "The workflow token must be read-only.");
assert.match(workflow, /^    if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'$/m,
  "The workflow definition must be dispatched from main only.");
assert.match(workflow, /^          ref: cap-consolidation-20261123$/m,
  "The initial checkout must come from the trusted CAP branch.");
assert.match(workflow, /^          persist-credentials: false$/m,
  "Checkout credentials must not persist into candidate scripts.");
assert.match(workflow, /^          if ! \[\[ "\$EXPECTED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]; then$/m,
  "The requested target must be a full lowercase 40-character SHA.");
assert.match(workflow, /TRUSTED_SHA="\$\(git rev-parse HEAD\)"/,
  "The workflow must capture the current trusted CAP branch head.");
assert.match(workflow, /test "\$EXPECTED_SHA" = "\$TRUSTED_SHA"/,
  "The requested SHA must equal the current trusted CAP head.");
assert.match(workflow, /git checkout --detach "\$EXPECTED_SHA"/,
  "Only the verified exact SHA may be checked out.");
assert.match(workflow, /test "\$ACTUAL_SHA" = "\$EXPECTED_SHA"/,
  "The final checked-out revision must equal the requested SHA.");
assert.doesNotMatch(workflow, /github\.head_ref|inputs\.target_ref \|\| github\.sha/,
  "No PR branch or implicit SHA fallback may activate Final QA.");

const verifyIndex = workflow.indexOf("- name: Verify requested SHA is the current trusted CAP head");
const setupIndex = workflow.indexOf("- name: Setup Node");
const installIndex = workflow.indexOf("- name: Install dependencies");
const firstQaSecretIndex = workflow.indexOf("BETHAG_QA_SERVICE_ROLE_KEY");
assert.ok(verifyIndex >= 0 && verifyIndex < setupIndex && verifyIndex < installIndex,
  "Trusted SHA verification must precede dependency installation and test execution.");
assert.ok(firstQaSecretIndex > verifyIndex,
  "QA credentials must not be exposed before the trusted SHA gate.");

console.log(JSON.stringify({
  status: "PASS",
  pull_request_trigger: "DISABLED",
  dispatch_source: "MAIN_ONLY",
  target_ref: "EXACT_CURRENT_TRUSTED_CAP_HEAD",
  token_permissions: "CONTENTS_READ_ONLY",
  checkout_credentials: "NOT_PERSISTED",
  qa_secrets_before_trust_gate: "NONE"
}, null, 2));
