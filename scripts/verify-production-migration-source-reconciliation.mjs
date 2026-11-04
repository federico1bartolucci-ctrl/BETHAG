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
      if (ch === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { fields.push(value); value = ""; }
    else value += ch;
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
  const fields = parseCsvLine(line);
  return { version: fields[0], name: fields[1], file: fields[2] };
});
const versions = new Set();
for (const row of ledgerRows) {
  if (!/^\d{14}$/.test(row.version)) throw new Error("Invalid ledger version: " + row.version);
  if (versions.has(row.version)) throw new Error("Duplicate Production ledger version: " + row.version);
  versions.add(row.version);
}

const sourceFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const prefixGroups = new Map();
for (const file of sourceFiles) {
  const prefix = file.slice(0, 14);
  if (!/^\d{14}$/.test(prefix)) throw new Error("Invalid migration filename prefix: " + file);
  prefixGroups.set(prefix, [...(prefixGroups.get(prefix) ?? []), file]);
}
const collisions = [...prefixGroups.entries()].filter((entry) => entry[1].length > 1);
const candidates = [];
const unmatchedLedgerRows = [];

for (const row of ledgerRows) {
  const exactVersionFiles = sourceFiles.filter((file) => file.slice(0, 14) === row.version);
  const nameFiles = sourceFiles.filter((file) => file.slice(15, -4) === row.name);
  const sourceFile = exactVersionFiles.length === 1 ? exactVersionFiles[0] : nameFiles[0];
  if (!sourceFile) {
    unmatchedLedgerRows.push(row.version);
    continue;
  }
  const sourceSql = await readFile(path.join(migrationsDir, sourceFile), "utf8");
  const ledgerSql = await readFile(path.join(archiveDir, row.file), "utf8");
  candidates.push({
    version: row.version,
    sourceFile,
    matches: normalizeSql(sourceSql) === normalizeSql(ledgerSql),
  });
}

const matched = candidates.filter((entry) => entry.matches);
const mismatched = candidates.filter((entry) => !entry.matches);
const archiveSqlFiles = (await readdir(archiveDir)).filter((file) => file.endsWith(".sql"));
const collisionFileCount = collisions.reduce((sum, entry) => sum + entry[1].length, 0);
const failures = [];

if (ledgerRows.length !== 247) failures.push("Expected 247 ledger archive rows; found " + ledgerRows.length);
if (archiveSqlFiles.length !== ledgerRows.length) failures.push("Archive SQL file count does not equal manifest row count");
if (sourceFiles.length !== 206) failures.push("Expected 206 current migration files; found " + sourceFiles.length);
if (collisions.length !== 9 || collisionFileCount !== 18) failures.push("Expected nine duplicate timestamp groups / 18 files; found " + collisions.length + " / " + collisionFileCount);
if (candidates.length !== 110) failures.push("Expected 110 ledger rows with source candidates; found " + candidates.length);
if (matched.length !== 70 || mismatched.length !== 40) failures.push("Expected 70 normalized matches / 40 content mismatches; found " + matched.length + " / " + mismatched.length);
if (unmatchedLedgerRows.length !== 137) failures.push("Expected 137 ledger rows without direct source candidates; found " + unmatchedLedgerRows.length);

console.log("Production ledger/source reconciliation: " + ledgerRows.length + " archived ledger versions; " + sourceFiles.length + " current migration files.");
console.log("Duplicate timestamps: " + collisions.length + " groups / " + collisionFileCount + " files.");
console.log("Ledger rows with source candidates: " + candidates.length + "; normalized SQL matches: " + matched.length + "; content mismatches: " + mismatched.length + "; no direct source: " + unmatchedLedgerRows.length + ".");
console.log("The recovered ledger archive is authoritative historical evidence. Filename matches do not authorize replay.");

if (failures.length) {
  console.error("Migration source reconciliation FAILED:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("Migration source reconciliation PASS: the documented inventory and all nine timestamp-collision groups are reproducible.");
}
