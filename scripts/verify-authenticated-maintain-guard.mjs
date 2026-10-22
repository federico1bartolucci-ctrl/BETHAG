import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const grantsPath = "supabase/migrations/20261017000005_bethag_baseline_grants.sql";
const runbookPath = "docs/MIGRATION_HISTORY_CUTOVER_RUNBOOK.md";
const [grantsSql, runbook] = await Promise.all([
  readFile(grantsPath, "utf8"),
  readFile(runbookPath, "utf8"),
]);

// Production's live ACL spot-check found MAINTAIN granted to authenticated on
// 34 public relations. Do not copy that privilege into the baseline until the
// least-privilege decision and complete ACL comparison are finished.
const authenticatedMaintainGrants = grantsSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^GRANT\b/i.test(line) && /\bMAINTAIN\b/i.test(line) && /\bTO\s+authenticated\s*;/i.test(line));

assert.deepEqual(
  authenticatedMaintainGrants,
  [],
  "Baseline must not grant MAINTAIN to authenticated while Production ACL parity remains unresolved.",
);

// Default privileges apply to tables created in the future, so check them
// separately from explicit GRANT statements.
const unsafeApplicationDefaultMaintainGrants = grantsSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) =>
    /^ALTER DEFAULT PRIVILEGES\b/i.test(line) &&
    /\bMAINTAIN\b/i.test(line) &&
    /\bTO\s+(?:anon|authenticated)\s*;/i.test(line)
  );

assert.deepEqual(
  unsafeApplicationDefaultMaintainGrants,
  [],
  "Baseline must not grant MAINTAIN by default to anon or authenticated.",
);
assert.match(runbook, /Concrete privilege discrepancy found on 2026-10-22/);
assert.match(runbook, /34 public relations/);
assert.match(runbook, /ACL parity gate blocked/);

console.log(JSON.stringify({
  authenticated_maintain_guard: "PASS",
  unsafe_baseline_grants_found: authenticatedMaintainGrants.length,
  unsafe_application_default_maintain_grants_found: unsafeApplicationDefaultMaintainGrants.length,
  production_discrepancy_relations_documented: 34,
  release_acl_parity: "BLOCKED_PENDING_RECONCILIATION",
}, null, 2));
