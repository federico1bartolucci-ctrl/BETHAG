import { readFile } from "node:fs/promises";

const live = JSON.parse(await readFile("supabase/rebuild/live-migration-ledgers-20261105.json", "utf8"));
const pair = (row) => row.version + "|" + row.name;
const p = new Set(live.production.migrations.map(pair));
const q = new Set(live.qa.migrations.map(pair));
const productionOnly = live.production.migrations.filter((row) => !q.has(pair(row)));
const qaOnly = live.qa.migrations.filter((row) => !p.has(pair(row)));
const report = {
  scope: "READ-ONLY MIGRATION RECONCILIATION PLAN — no SQL commands and no remote changes",
  captured_at: live.captured_at,
  production: { project_ref: live.production.project_ref, rows: live.production.migrations.length, head: live.production.migrations.at(-1), production_only: productionOnly },
  qa: { project_ref: live.qa.project_ref, rows: live.qa.migrations.length, head: live.qa.migrations.at(-1), qa_only_count: qaOnly.length, qa_only: qaOnly },
  common_exact_version_name_pairs: [...p].filter((key) => q.has(key)).length,
  canonical_chain: { files: 24, policy: "Do not replay historical ledgers or copy environment-specific ledger rows. Promote only reviewed canonical forward migrations through the guarded runner after independent rehearsal." },
  unresolved: [
    "The live migration registry snapshot contains version/name pairs; it does not contain all original SQL payloads.",
    "Historical payload hash equivalence for every QA-only/common row is not proven by this snapshot.",
    "Reconcile catalog/default-ACL differences and production/QA Data API exposure separately.",
    "Full APP-01–APP-15 acceptance, backup/restore evidence and written cutover approval remain release gates."
  ],
  decision: "NO-GO — point 5 remains open; preserve both remote environments unchanged."
};
console.log(JSON.stringify(report, null, 2));
