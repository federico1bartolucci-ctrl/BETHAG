import { readFile, readdir } from "node:fs/promises";

const live = JSON.parse(await readFile("supabase/rebuild/live-migration-ledgers-20261105.json", "utf8"));
const pair = (row) => row.version + "|" + row.name;
const productionSet = new Set(live.production.migrations.map(pair));
const qaSet = new Set(live.qa.migrations.map(pair));
const productionOnly = live.production.migrations.filter((row) => !qaSet.has(pair(row)));
const qaOnly = live.qa.migrations.filter((row) => !productionSet.has(pair(row)));
const migrationFiles = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();

const report = {
  scope: "READ-ONLY PLAN — no migration tracking or database changes",
  captured_at: live.captured_at,
  production: {
    project_ref: live.production.project_ref,
    historical_ledger_rows_to_preserve: live.production.migrations.length,
    latest: live.production.migrations.at(-1),
    production_only: productionOnly,
    canonical_migration_files: migrationFiles.length,
    historical_rows_to_rewrite_or_delete: 0
  },
  qa: {
    project_ref: live.qa.project_ref,
    ledger_rows: live.qa.migrations.length,
    latest: live.qa.migrations.at(-1),
    qa_only_count: qaOnly.length,
    qa_only: qaOnly,
    action: "Preserve the existing QA branch and its data; do not reset, recreate, replay, or copy QA-only ledger rows into Production."
  },
  common_exact_version_name_pairs: [...productionSet].filter((key) => qaSet.has(key)).length,
  forensic_history: {
    replay: "BLOCKED — recovered historical SQL is not a self-contained replayable chain. Retain historical payloads as immutable evidence.",
    payload_equivalence: "Historical payload hash equivalence for every common and QA-only ledger row is not yet demonstrated by this registry snapshot."
  },
  release_gates: [
    "Complete payload provenance/hash mapping or formally bound verification to reviewed canonical forward migrations with independent evidence.",
    "Reconcile live catalog, explicit PUBLIC EXECUTE ACLs and global/schema default privileges.",
    "Verify Data API exposure settings separately in Production; QA screenshots do not prove Production configuration.",
    "Verified isolated backup restore: retain actual provider-backed restore evidence or document an explicit named residual-risk acceptance; do not claim an unperformed physical restore.",
    "Complete APP-01–APP-15 acceptance and release evidence.",
    "Obtain written cutover approval naming exact commit, SQL hashes, maintenance window and rollback criteria."
  ],
  execution_plan: [
    "Keep Production and the single existing QA environment unchanged during reconciliation.",
    "Do not replay historical migration payloads or copy environment-specific ledger rows.",
    "Promote only reviewed canonical forward migrations through the guarded runner after independent PostgreSQL 17 rehearsal and all release gates."
  ],
  action: "PLAN_ONLY_NO_COMMANDS"
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--print-commands")) {
  console.error("BLOCKED: no generic migration-repair or production execution commands are emitted. Historical payload provenance and release gates remain incomplete; use only the reviewed canonical runner after written approval.");
  process.exitCode = 2;
}
if (process.argv.includes("--print-review-checklist")) {
  console.log([
    "",
    "REVIEW CHECKLIST — NO COMMANDS EXECUTED",
    "1. Confirm live Production and QA migration pairs immediately before any approved operation.",
    "2. Verify source payload hashes for every migration in the promotion scope.",
    "3. Confirm the canonical migration chain and baseline exclusions.",
    "4. Complete ordered PostgreSQL 17 rehearsal and verify all postconditions.",
    "5. Reconcile live catalog, ACLs, default privileges and Production Data API exposure.",
    "Verified isolated backup restore: require actual restore evidence or documented residual-risk acceptance.",
    "6. Complete APP-01–APP-15 and preserve the existing QA data.",
    "7. Obtain written approval for exact commit, SQL hashes, maintenance window and rollback criteria.",
    "8. Stop if any live ledger, catalog, ACL, backup or source mapping differs from reviewed evidence."
  ].join("\n"));
}
