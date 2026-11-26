import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/storage-backup-r2.yml", "utf8");
const runbook = await readFile("docs/STORAGE_BACKUP_R2.md", "utf8");

const jobGate = workflow.match(/^    if: (.+)$/m)?.[1];
assert.ok(jobGate, "backup job must have a job-level activation condition");
assert.ok(jobGate.includes("event_name == 'schedule'"));
assert.ok(jobGate.includes("event_name == 'workflow_dispatch'"));
assert.ok(jobGate.includes("github.ref == 'refs/heads/main'"));
assert.ok(jobGate.includes("vars.STORAGE_BACKUP_ENABLED == 'true'"));

const environmentLine = workflow.indexOf("    environment: storage-backup-production");
const jobGateLine = workflow.indexOf("    if: ");
assert.ok(environmentLine > jobGateLine, "job-level gate must be evaluated before the protected Environment is entered");
assert.doesNotMatch(workflow, /^        if:/m, "activation must not be deferred to runner steps");
assert.ok(workflow.includes("secrets.R2_SECRET_ACCESS_KEY"));
assert.ok(workflow.includes("secrets.SUPABASE_S3_SECRET_ACCESS_KEY"));

assert.ok(runbook.includes("repository-level Actions variable** `STORAGE_BACKUP_ENABLED`"));
assert.ok(runbook.includes("before the job references `storage-backup-production`"));
assert.ok(!runbook.includes("Environment variable `STORAGE_BACKUP_ENABLED`"));

function shouldStartBackup({ event, ref, enabled }) {
  return (event === "schedule" || event === "workflow_dispatch") && ref === "refs/heads/main" && enabled === "true";
}

const cases = [
  [{ event: "schedule", ref: "refs/heads/main", enabled: "true" }, true],
  [{ event: "workflow_dispatch", ref: "refs/heads/main", enabled: "true" }, true],
  [{ event: "schedule", ref: "refs/heads/main", enabled: "false" }, false],
  [{ event: "schedule", ref: "refs/heads/main", enabled: undefined }, false],
  [{ event: "push", ref: "refs/heads/main", enabled: "true" }, false],
  [{ event: "schedule", ref: "refs/heads/feature", enabled: "true" }, false]
];
for (const [input, expected] of cases) assert.equal(shouldStartBackup(input), expected, JSON.stringify(input));

console.log("PASS: R2 activation-gate runtime regression");
console.log("PASS: disabled or unset repository variable skips before Environment protection");
console.log("PASS: only scheduled/manual main runs with exact true activation enter the protected Environment");
