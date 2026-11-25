import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/storage-backup-r2.yml", "utf8");
const runbook = await readFile("docs/STORAGE_BACKUP_R2.md", "utf8");

const jobGate = workflow.match(/^    if: (.+)$/m)?.[1];
assert.ok(jobGate, "backup job must have a job-level activation condition");
assert.match(jobGate, /github\.event_name == 'schedule'/);
assert.match(jobGate, /github\.event_name == 'workflow_dispatch'/);
assert.match(jobGate, /github\.ref == 'refs\/heads\/main'/);
assert.match(jobGate, /vars\.STORAGE_BACKUP_ENABLED == 'true'/);

const environmentLine = workflow.indexOf("    environment: storage-backup-production");
const jobGateLine = workflow.indexOf("    if: ");
assert.ok(environmentLine > jobGateLine, "job-level gate must be evaluated before the protected Environment is entered");
assert.doesNotMatch(workflow, /^        if:/m, "activation must not be deferred to runner steps");
assert.match(workflow, /secrets\.R2_SECRET_ACCESS_KEY/);
assert.match(workflow, /secrets\.SUPABASE_S3_SECRET_ACCESS_KEY/);

assert.match(runbook, /repository-level Actions variable `STORAGE_BACKUP_ENABLED`/);
assert.match(runbook, /before the job references `storage-backup-production`/);
assert.doesNotMatch(runbook, /Environment variable `STORAGE_BACKUP_ENABLED`/);

function shouldStartBackup({ event, ref, enabled }) {
  return (event === "schedule" || event === "workflow_dispatch") &&
    ref === "refs/heads/main" &&
    enabled === "true";
}

const cases = [
  [{ event: "schedule", ref: "refs/heads/main", enabled: "true" }, true],
  [{ event: "workflow_dispatch", ref: "refs/heads/main", enabled: "true" }, true],
  [{ event: "schedule", ref: "refs/heads/main", enabled: "false" }, false],
  [{ event: "schedule", ref: "refs/heads/main", enabled: undefined }, false],
  [{ event: "push", ref: "refs/heads/main", enabled: "true" }, false],
  [{ event: "schedule", ref: "refs/heads/feature", enabled: "true" }, false]
];
for (const [input, expected] of cases) {
  assert.equal(shouldStartBackup(input), expected, JSON.stringify(input));
}

console.log("PASS: R2 activation-gate runtime regression");
console.log("PASS: disabled or unset repository variable skips the job before Environment protection");
console.log("PASS: only scheduled/manual main runs with exact true activation can enter the protected Environment");
