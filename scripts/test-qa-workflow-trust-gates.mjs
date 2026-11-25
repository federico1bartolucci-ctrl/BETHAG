import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(".github/workflows/build.yml", "utf8");
assert.doesNotMatch(build, /BETHAG_QA_|Run authenticated QA|Certify real QA authentication/,
  "The general Build workflow must not receive shared-QA credentials or run authenticated QA.");

const workflows = [
  ".github/workflows/qa-navigation.yml",
  ".github/workflows/qa-app05-07.yml",
  ".github/workflows/qa-app08-11.yml",
  ".github/workflows/qa-authenticated-rls.yml"
];

for (const path of workflows) {
  const workflow = await readFile(path, "utf8");
  assert.match(workflow, /^on:\n  workflow_dispatch:\n    inputs:/m,
    path + ": manual dispatch with explicit inputs is required.");
  assert.doesNotMatch(workflow, /^  (push|pull_request|pull_request_target|schedule|repository_dispatch):/m,
    path + ": shared-QA workflow must not run from automatic repository events.");
  assert.match(workflow, /^permissions:\n  contents: read$/m,
    path + ": workflow token must be read-only.");
  assert.match(workflow, /^  group: bethag-qa-shared-environment$/m,
    path + ": all shared-QA workflows must serialize on the common concurrency group.");
  assert.match(workflow, /^      target_ref:/m,
    path + ": an exact candidate SHA must be required.");
  assert.match(workflow, /^        required: true$/m,
    path + ": target_ref must be required.");
  assert.doesNotMatch(workflow, /^        default:/m,
    path + ": target_ref must not have an implicit default.");
  assert.match(workflow, /^    if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'$/m,
    path + ": dispatch must originate from main.");
  assert.match(workflow, /^          ref: cap-consolidation-20261123$/m,
    path + ": checkout must start from the trusted CAP branch.");
  assert.match(workflow, /^          persist-credentials: false$/m,
    path + ": checkout credentials must not persist.");
  assert.match(workflow, /^          EXPECTED_SHA: \$\{\{ inputs\.target_ref \}\}$/m,
    path + ": the requested SHA must be passed explicitly.");
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/,
    path + ": the target must be a full lowercase 40-character SHA.");
  assert.match(workflow, /test "\$EXPECTED_SHA" = "\$TRUSTED_SHA"/,
    path + ": the requested SHA must equal the trusted CAP head.");
  assert.match(workflow, /git checkout --detach "\$EXPECTED_SHA"/,
    path + ": the verified SHA must be checked out detached.");
  assert.match(workflow, /test "\$ACTUAL_SHA" = "\$EXPECTED_SHA"/,
    path + ": the final checkout SHA must be verified.");
  assert.doesNotMatch(workflow, /github\.head_ref|inputs\.target_ref \|\| github\.sha/,
    path + ": no PR-head or implicit-SHA fallback is allowed.");

  const verifyIndex = workflow.indexOf("- name: Verify requested SHA is the current trusted CAP head");
  const setupIndex = workflow.indexOf("- uses: actions/setup-node@v4");
  const installIndex = workflow.indexOf("- name: Install dependencies");
  const firstSecretIndex = workflow.search(/secrets\.BETHAG_QA_/);
  assert.ok(verifyIndex >= 0 && verifyIndex < setupIndex && verifyIndex < installIndex,
    path + ": trusted SHA validation must precede dependency installation.");
  assert.ok(firstSecretIndex > verifyIndex,
    path + ": QA credentials must not be exposed before trusted SHA validation.");
}

console.log(JSON.stringify({
  status: "PASS",
  build_workflow_shared_qa: "REMOVED",
  authenticated_qa_workflows: workflows.length,
  automatic_triggers: "DISABLED",
  dispatch_source: "MAIN_ONLY",
  target_sha: "CURRENT_TRUSTED_CAP_HEAD_ONLY",
  token_permissions: "CONTENTS_READ_ONLY",
  checkout_credentials: "NOT_PERSISTED",
  shared_qa_concurrency: "SERIALIZED"
}, null, 2));
