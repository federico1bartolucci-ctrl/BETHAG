import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const snapshotPath = "supabase/rebuild/production-schema-catalog-20261017.json";
const migrationPath = "supabase/migrations/20261017000001_bethag_baseline_schema.sql";
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const sql = await readFile(migrationPath, "utf8");

assert.equal(snapshot.project_ref, "tctcgptrsmvgajqjgnev", "Schema snapshot must belong to BETHAG Production.");
assert.equal(snapshot.captured_at_utc, "2026-10-17", "Review this assertion when refreshing the Production snapshot.");
const expectedTables = snapshot.objects.tables.filter((table) => table.schema_name === "public");
assert.equal(expectedTables.length, 47, "Expected 47 captured public tables.");

const tableBlocks = new Map();
const tableStart = /CREATE TABLE "public"\."([^"]+)" \(/g;
for (const match of sql.matchAll(tableStart)) {
  const start = match.index + match[0].length;
  let depth = 1;
  let quote = false;
  let end = start;
  for (; end < sql.length; end++) {
    const char = sql[end];
    if (char === '"' && sql[end + 1] === '"') { end++; continue; }
    if (char === '"') quote = !quote;
    if (!quote && char === "(") depth++;
    if (!quote && char === ")" && --depth === 0) break;
  }
  assert.ok(end < sql.length, `Unterminated CREATE TABLE for ${match[1]}`);
  tableBlocks.set(match[1], sql.slice(start, end));
}
assert.equal(tableBlocks.size, expectedTables.length, "Baseline and snapshot public table counts differ.");

function parseColumnLine(line) {
  const match = line.match(/^\s{2}"([^"]+)"\s+(.+?),?$/);
  if (!match) return null;
  const [, name, remainder] = match;
  // Type ends before the column DEFAULT or NOT NULL clauses. Parenthesized
  // type modifiers (for example numeric(14,2)) are retained.
  let type = "";
  let depth = 0;
  let quote = false;
  const upper = remainder.toUpperCase();
  for (let i = 0; i < remainder.length; i++) {
    const ch = remainder[i];
    if (ch === "'" && remainder[i + 1] === "'") { i++; continue; }
    if (ch === "'") quote = !quote;
    if (!quote && ch === "(") depth++;
    if (!quote && ch === ")") depth--;
    if (!quote && depth === 0 && (upper.startsWith(" DEFAULT ", i) || upper.startsWith(" NOT NULL", i))) {
      type = remainder.slice(0, i).trim();
      break;
    }
  }
  if (!type) type = remainder.replace(/,$/, "").trim();
  return { name, type: type.replaceAll('"', "").replace(/\s+/g, " ").trim(), notNull: /\bNOT NULL\b/i.test(remainder) };
}

const mismatches = [];
let columnsChecked = 0;
for (const table of expectedTables) {
  const block = tableBlocks.get(table.table_name);
  assert.ok(block, `Baseline is missing table public.${table.table_name}`);
  const actualColumns = block.split("\n").map(parseColumnLine).filter(Boolean);
  const expectedColumns = [...table.columns].sort((a, b) => a.position - b.position);
  const actualByName = new Map(actualColumns.map((column) => [column.name, column]));
  const expectedNames = expectedColumns.map((column) => column.name);
  const actualNames = actualColumns.map((column) => column.name);
  const missing = expectedNames.filter((name) => !actualByName.has(name));
  const unexpected = actualNames.filter((name) => !expectedNames.includes(name));
  const columnDifferences = [];
  for (const expected of expectedColumns) {
    const actual = actualByName.get(expected.name);
    if (!actual) continue;
    columnsChecked++;
    const normalizedExpectedType = expected.type.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedActualType = actual.type.toLowerCase();
    if (normalizedActualType !== normalizedExpectedType || actual.notNull !== expected.not_null) {
      columnDifferences.push({
        column: expected.name,
        expected: { type: normalizedExpectedType, not_null: expected.not_null },
        actual: { type: normalizedActualType, not_null: actual.notNull },
      });
    }
  }
  if (missing.length || unexpected.length || columnDifferences.length) {
    mismatches.push({ table: table.table_name, missing, unexpected, columnDifferences });
  }
}
assert.deepEqual(mismatches, [], "Baseline column names, SQL types, or NOT NULL attributes differ from captured Production schema.");

console.log(JSON.stringify({
  baseline_schema_column_parity: "PASS",
  source_snapshot_date: snapshot.captured_at_utc,
  tables_checked: expectedTables.length,
  columns_checked: columnsChecked,
  attributes_checked: ["column name", "SQL type", "NOT NULL"],
  note: "This compares the baseline with the captured read-only Production schema snapshot; defaults, constraints, indexes, policies and triggers require separate checks. No live Production connection or writes are performed.",
}, null, 2));
