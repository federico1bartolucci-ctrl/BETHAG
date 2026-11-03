import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const archiveDir = path.join(root, "supabase", "recovered-production-ledger");
const migrationsDir = path.join(root, "supabase", "migrations");
const manifestPath = path.join(archiveDir, "MANIFEST.csv");

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      fields.push(value);
      value = "";
    } else value += ch;
  }
  if (quoted) throw new Error("Malformed CSV: unterminated quoted field");
  fields.push(value);
  return fields;
}

function normalizeSql(sql) {
  return sql.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

const manifestLines = (await readFile(manifestPath, "utf8")).trimEnd().split(/\r?\n/);
const header = parseCsvLine(manifestLines.shift());
const expectedHeader = ["version", "name", "file", "statement_count", "sql_chars", "payload_md5"];
if (header.join("|") !== expectedHeader.join("|")) throw new Error("Unexpected archive manifest header");

const ledgerRows = manifestLines.map((line) => {
  const [version, name, file, statementCount, sqlChars, md5] = parseCsvLine(line);
  return { version, name, file, statementCount: Number(statementCount), sqlChars: Number(sqlChars), md5 };
});
const names = new Map();
const versions = new Set();
for (const row of ledgerRows) {
  if (!/^\d{14}$/.test(row.version)) throw new Error(`Invalid ledger version: \${row.version}`);
  if (versions.has(row.version)) throw new Error(`Duplicate Production ledger version: \${row.version}`);
  versions.add(row.version);
  if (names.has(row.name)) throw new Error(`Ambiguous duplicate Production ledger name: \${row.name}`);
  names.set(row.name, row);
}

const sourceFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const prefixGroups = new Map();
for (const file of sourceFiles) {
  const prefix = file.slice(0, 14);
  if (!/^\d{14}$/.test(prefix)) throw new Error(`Invalid migration filename prefix: \${file}`);
  prefixGroups.set(prefix, [...(prefixGroups.get(prefix) ?? []), file]);
}
const collisions = [...prefixGroups.entries()].filter(([, files]) => files.length > 1);
const candidates = [];
const unmatched = [];
for (const file of sourceFiles) {
  const sourceName = file.slice(15, -4);
  const ledger = names.get(sourceName);
  if (!ledger) {
    unmatched.push(file);
    continue;
  }
  const [sourceSql, ledgerSql] = await Promise.all([
    readFile(path.join(migrationsDir, file), "utf8"),
    readFile(path.join(archiveDir, ledger.file), "utf8"),
  ]);
  candidates.push({ file, ledgerVersion: ledger.version, matches: normalizeSql(sourceSql) === normalizeSql(ledgerSql) });
}

const matched = candidates.filter((candidate) => candidate.matches);
const mismatch = candidates.filter((candidate) => !candidate.matches);
const archiveSqlFiles = (await readdir(archiveDir)).filter((file) => file.endsWith(".sql"));
const collisionFileCount = collisions.reduce((sum, [, files]) => sum + files.length, 0);

const failures = [];
if (ledgerRows.length !== 247) failures.push(`expected 247 ledger archive rows, found \${ledgerRows.length}`);
if (archiveSqlFiles.length !== ledgerRows.length) failures.push(`archive has \${archiveSqlFiles.length} SQL files for \${ledgerRows.length} manifest rows`);
if (sourceFiles.length !== 206) failures.push(`expected 206 current migration files, found \${sourceFiles.length}`);
if (collisions.length !== 9 || collisionFileCount !== 18) failures.push(`expected nine duplicate timestamp groups containing 18 files; found \${collisions.length} groups / \${collisionFileCount} files`);
if (candidates.length !== 110) failures.push(`expected 110 same-name source candidates, found \${candidates.length}`);
if (matched.length !== 70 || mismatch.length !== 40) failures.push(`expected 70 normalized SQL matches and 40 mismatches; found \${matched.length} / \${mismatch.length}`);
if (unmatched.length !== 96) failures.push(`expected 96 current files without a direct ledger-name candidate, found \${unmatched.length}`);

console.log(`Production ledger/source reconciliation: \${ledgerRows.length} archived ledger versions; \${sourceFiles.length} current migration files.`);
console.log(`Duplicate timestamps: \${collisions.length} groups / \${collisionFileCount} files.`);
console.log(`Same-name source candidates: \${candidates.length}; normalized SQL matches: \${matched.length}; content mismatches: \${mismatch.length}; no direct name candidate: \${unmatched.length}.`);
console.log("The recovered ledger archive is authoritative historical evidence; current source files are not replay inputs merely because their names match.");

if (failures.length) {
  console.error("Migration source reconciliation FAILED:");
  for (const failure of failures) console.error(`- \${failure}`);
  process.exitCode = 1;
} else console.log("Migration source reconciliation PASS: the documented inventory and all nine timestamp-collision groups are reproducible.");
