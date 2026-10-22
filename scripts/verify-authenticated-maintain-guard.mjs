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

// Relation-level grants are distinct from column-level UPDATE grants.
// Production's catalog has no explicit column ACLs and no relation grant
// options. Keep the baseline aligned with that observed state.
const columnGrantLines = grantsSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^GRANT\s+(?:SELECT|UPDATE|INSERT|REFERENCES)\s*\(/i.test(line) && /\bON TABLE public\./i.test(line));
assert.deepEqual(columnGrantLines, [], "Baseline must not introduce column ACLs absent from Production.");

const relationGrantOptionLines = grantsSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^GRANT\b/i.test(line) && /\bON TABLE public\./i.test(line) && !/^GRANT\s+(?:SELECT|UPDATE|INSERT|REFERENCES)\s*\(/i.test(line) && /\bWITH GRANT OPTION\s*;/i.test(line));
assert.deepEqual(relationGrantOptionLines, [], "Baseline must not introduce relation grant options absent from Production.");

const relationGrantLines = grantsSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^GRANT\b/i.test(line) && /\bON TABLE public\./i.test(line) && !/^GRANT\s+(?:SELECT|UPDATE|INSERT|REFERENCES)\s*\(/i.test(line));
const relationGrants = relationGrantLines.map((line) => {
  const match = line.match(/^GRANT\s+(.+?)\s+ON TABLE public\.([a-zA-Z0-9_]+)\s+TO\s+([a-zA-Z0-9_]+)(?:\s+WITH GRANT OPTION)?;$/i);
  assert.ok(match, `Cannot parse relation grant: ${line}`);
  return { privileges: match[1].split(",").map((value) => value.trim().toUpperCase()), table: match[2], grantee: match[3] };
});
const serviceRoleTablesMissingMaintain = relationGrants.filter((grant) => grant.grantee === "service_role" && !grant.privileges.includes("MAINTAIN"));
const postgresTablesMissingMaintain = relationGrants.filter((grant) => grant.grantee === "postgres" && !grant.privileges.includes("MAINTAIN"));
const authenticatedTablesWithMaintain = relationGrants.filter((grant) => grant.grantee === "authenticated" && grant.privileges.includes("MAINTAIN"));
assert.equal(serviceRoleTablesMissingMaintain.length, 0, "Baseline must preserve MAINTAIN on all explicit service_role table grants.");
assert.equal(postgresTablesMissingMaintain.length, 0, "Baseline must preserve MAINTAIN on all explicit postgres table grants.");
assert.equal(authenticatedTablesWithMaintain.length, 0, "Baseline must not explicitly grant MAINTAIN to authenticated.");
assert.equal(relationGrants.filter((grant) => grant.grantee === "service_role").length, 48, "Expected relation grants for service_role on 48 public relations.");
assert.equal(relationGrants.filter((grant) => grant.grantee === "postgres").length, 48, "Expected relation grants for postgres on 48 public relations.");
assert.match(runbook, /Concrete privilege discrepancy found on 2026-10-22/);
assert.match(runbook, /34 public relations/);
assert.match(runbook, /ACL parity gate blocked/);
assert.match(runbook, /82 expanded default-ACL privilege entries/);
assert.match(runbook, /supabase_admin` table defaults also include `MAINTAIN`/);
assert.match(runbook, /0 relation ACL entries with grant option/);
assert.match(runbook, /0 explicit column ACL entries/);

// Pin the known Production exception set so future runbook edits cannot
// silently drop an affected relation from the release-blocker record.
const productionAuthenticatedMaintainRelations = [
  "communication_recipients",
  "condominium_accounting_settings",
  "condominium_allocation_intakes",
  "condominium_allocation_rules",
  "condominium_audit_log",
  "condominium_budgets",
  "condominium_consumption_readings",
  "condominium_creation_intakes",
  "condominium_expense_allocations",
  "condominium_fiscal_carryover_compensations",
  "condominium_fiscal_carryovers",
  "condominium_fiscal_years",
  "condominium_fund_availability",
  "condominium_funds",
  "condominium_installments",
  "condominium_insurance_policies",
  "condominium_ledger_entries",
  "condominium_legal_cases",
  "condominium_member_transfers",
  "condominium_millesimal_tables",
  "condominium_millesimal_values",
  "condominium_payment_movements",
  "condominium_register_items",
  "condominium_suppliers",
  "condominium_tax_obligations",
  "condominium_unit_transformation_items",
  "condominium_unit_transformations",
  "condominium_units",
  "condominium_work_documents",
  "condominium_work_events",
  "condominium_work_progress",
  "condominium_works",
  "portal_registration_requests",
  "user_security_settings",
];
assert.equal(productionAuthenticatedMaintainRelations.length, 34, "Expected the complete 34-relation Production exception register.");
for (const relation of productionAuthenticatedMaintainRelations) {
  assert.ok(runbook.includes(relation), `Runbook must keep the Production MAINTAIN exception for ${relation} documented.`);
}

console.log(JSON.stringify({
  authenticated_maintain_guard: "PASS",
  unsafe_baseline_grants_found: authenticatedMaintainGrants.length,
  unsafe_application_default_maintain_grants_found: unsafeApplicationDefaultMaintainGrants.length,
  service_role_relation_grants_checked: relationGrants.filter((grant) => grant.grantee === "service_role").length,
  postgres_relation_grants_checked: relationGrants.filter((grant) => grant.grantee === "postgres").length,
  authenticated_relation_maintain_grants_found: authenticatedTablesWithMaintain.length,\n  baseline_column_acl_statements_found: columnGrantLines.length,\n  baseline_relation_grant_options_found: relationGrantOptionLines.length,
  production_discrepancy_relations_documented: productionAuthenticatedMaintainRelations.length,
  release_acl_parity: "BLOCKED_PENDING_RECONCILIATION",
}, null, 2));
