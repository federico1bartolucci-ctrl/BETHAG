import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";

const LEDGER_PATH = "supabase/rebuild/production-ledger-20261017.json";
const MIGRATIONS_DIR = "supabase/migrations";

export function normalizeMigrationName(value) {
  let name = value.replace(/\\.sql$/, "");
  while (/^\\d{14}_/.test(name)) name = name.slice(15);
  return name;
}

export function auditLedger(ledger, filenames) {
  const sources = filenames
    .filter((file) => file.endsWith(".sql"))
    .map((file) => ({ file, version: file.slice(0, 14), name: normalizeMigrationName(file.slice(15)) }));
  return ledger.migrations.map((entry) => {
    const normalized = normalizeMigrationName(entry.name);
    const candidates = sources.filter((source) => source.name === normalized);
    if (candidates.length === 0) return { ...entry, status: "missing_source", candidates: [] };
    if (candidates.length > 1) return { ...entry, status: "ambiguous_name", candidates: candidates.map((x) => x.file) };
    const source = candidates[0];
    return {
      ...entry,
      status: source.version === entry.version ? "exact" : "version_mismatch",
      source: source.file,
    };
  });
}

async function main() {
  const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  const files = await readdir(MIGRATIONS_DIR);
  const results = auditLedger(ledger, files);
  const counts = Object.fromEntries(
    ["exact", "version_mismatch", "missing_source", "ambiguous_name"].map((status) => [
      status,
      results.filter((item) => item.status === status).length,
    ]),
  );
  console.log(JSON.stringify({ captured_at_utc: ledger.captured_at_utc, production_records: results.length, counts, unresolved: results.filter((x) => x.status === "missing_source" || x.status === "ambiguous_name") }, null, 2));
  if (counts.missing_source > 0 || counts.ambiguous_name > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\\\/g, "/"))) {
  await main();
}
