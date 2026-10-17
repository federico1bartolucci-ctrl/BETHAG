import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const LEDGER_PATH = "supabase/rebuild/production-ledger-20261017.json";
const CATALOG_PATH = "supabase/rebuild/migration-source-catalog.json";

export function normalizeMigrationName(value) {
  let name = value.replace(/\.sql$/, "");
  while (/^\d{14}_/.test(name)) name = name.slice(15);
  return name;
}

export function auditLedger(ledger, sourceCatalog) {
  const sources = sourceCatalog
    .filter((source) => source.path.endsWith(".sql"))
    .map((source) => ({ ...source, normalizedName: normalizeMigrationName(source.name) }));
  return ledger.migrations.map((entry) => {
    const normalized = normalizeMigrationName(entry.name);
    const candidates = sources.filter((source) => source.normalizedName === normalized);
    if (candidates.length === 0) return { ...entry, status: "missing_source", candidates: [] };
    const distinctBlobs = [...new Set(candidates.map((source) => source.sha))];
    if (distinctBlobs.length > 1) {
      return {
        ...entry,
        status: "ambiguous_name",
        distinct_blobs: distinctBlobs.length,
        candidates: candidates.map(({ path, version, sha, branches }) => ({ path, version, sha, branches })),
      };
    }
    const source = candidates.find((candidate) => candidate.version === entry.version) ?? candidates[0];
    return {
      ...entry,
      status: source.version === entry.version ? "exact" : "version_mismatch",
      source: { path: source.path, version: source.version, sha: source.sha },
      branches: [...new Set(candidates.flatMap((candidate) => candidate.branches))].sort(),
    };
  });
}

async function main() {
  const [ledger, catalog] = await Promise.all([
    readFile(LEDGER_PATH, "utf8").then(JSON.parse),
    readFile(CATALOG_PATH, "utf8").then(JSON.parse),
  ]);
  const results = auditLedger(ledger, catalog.files);
  const statuses = ["exact", "version_mismatch", "missing_source", "ambiguous_name"];
  const counts = Object.fromEntries(statuses.map((status) => [
    status,
    results.filter((item) => item.status === status).length,
  ]));
  console.log(JSON.stringify({
    captured_at_utc: ledger.captured_at_utc,
    production_records: results.length,
    branches_scanned: catalog.branches_scanned.length,
    source_entries: catalog.files.length,
    counts,
    unresolved: results.filter((item) => item.status === "missing_source" || item.status === "ambiguous_name"),
  }, null, 2));
  if (counts.missing_source > 0 || counts.ambiguous_name > 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
