import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(await readFile("supabase/rebuild/production-schema-catalog-20261017.json", "utf8"));
const sql = await readFile("supabase/migrations/20261017000001_bethag_baseline_schema.sql", "utf8");
assert.equal(snapshot.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(snapshot.captured_at_utc, "2026-10-17");
const expectedTables = snapshot.objects.tables.filter((table) => table.schema_name === "public");
assert.equal(expectedTables.length, 47);

const tableBlocks = new Map();
for (const match of sql.matchAll(/CREATE TABLE "public"\."([^"]+)" \(/g)) {
  const start = match.index + match[0].length;
  let depth = 1, quote = false, end = start;
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
  let type = "", depth = 0, quote = false;
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
  const defaultMatch = remainder.match(/\bDEFAULT\\s+(.+?)(?=\s+NOT NULL\b|$)/i);
  const defaultValue = defaultMatch ? defaultMatch[1].replace(/,$/, "").trim() : null;
  return {
    name,
    type: type.replaceAll('"', "").replace(/\s+/g, " ").trim(),
    notNull: /\bNOT NULL\\b/i.test(remainder),
    defaultValue,
  };
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
  const orderMismatch = JSON.stringify(actualNames) !== JSON.stringify(expectedNames);
  const columnDifferences = [];
  for (const expected of expectedColumns) {
    const actual = actualByName.get(expected.name);
    if (!actual) continue;
    columnsChecked++;
    const normalizedExpectedType = expected.type.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedActualType = actual.type.toLowerCase();
    const normalizedExpectedDefault = expected.default === null ? null : expected.default.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedActualDefault = actual.defaultValue === null ? null : actual.defaultValue.replace(/\s+/g, " ").trim().toLowerCase();
    if (
      normalizedActualType !== normalizedExpectedType ||
      actual.notNull !== expected.not_null ||
      normalizedActualDefault !== normalizedExpectedDefault
    ) {
      columnDifferences.push({ column: expected.name, expected: { type: normalizedExpectedType, not_null: expected.not_null, default: normalizedExpectedDefault }, actual: { type: normalizedActualType, not_null: actual.notNull, default: normalizedActualDefault } });
    }
  }
  if (missing.length || unexpected.length || orderMismatch || columnDifferences.length) mismatches.push({ table: table.table_name, missing, unexpected, orderMismatch, expectedOrder: orderMismatch ? expectedNames : undefined, actualOrder: orderMismatch ? actualNames : undefined, columnDifferences });
}
assert.deepEqual(mismatches, [], "Baseline column names, SQL types, NOT NULL attributes, or defaults differ from captured Production schema.");

const indexesSql = await readFile("supabase/migrations/20261017000002_bethag_baseline_indexes_views.sql", "utf8");
const securitySql = await readFile("supabase/migrations/20261017000004_bethag_baseline_security.sql", "utf8");
const expectedConstraints = expectedTables.flatMap((table) => table.constraints.filter((constraint) => constraint.type !== "t").map((constraint) => constraint.name)).sort();
const actualConstraints = [...sql.matchAll(/ADD CONSTRAINT "([^"]+)"/g)].map((match) => match[1]).sort();
assert.deepEqual(actualConstraints, expectedConstraints, "Baseline constraint names differ from captured Production schema.");

const constraintBackedIndexNames = new Set(expectedConstraints);
const expectedIndexes = snapshot.objects.indexes.filter((index) => index.schema === "public" && !constraintBackedIndexNames.has(index.name)).map((index) => index.name).sort();
const actualIndexes = [...indexesSql.matchAll(/^CREATE (?:UNIQUE )?INDEX "?([^" ]+)"?\s/gm)].map((match) => match[1]).sort();
assert.deepEqual(actualIndexes, expectedIndexes, "Baseline index names differ from captured Production schema.");

const expectedPolicies = snapshot.objects.policies.filter((policy) => policy.schema === "public").map((policy) => policy.name).sort();
const actualPolicies = [...securitySql.matchAll(/^CREATE POLICY "([^"]+)"/gm)].map((match) => match[1]).sort();
assert.deepEqual(actualPolicies, expectedPolicies, "Baseline RLS policy names differ from captured Production schema.");

const expectedTriggers = snapshot.objects.triggers.filter((trigger) => trigger.schema === "public").map((trigger) => trigger.name).sort();
const actualTriggers = [...securitySql.matchAll(/^CREATE (?:CONSTRAINT )?TRIGGER "?([^" ]+)"?/gm)].map((match) => match[1]).sort();
assert.deepEqual(actualTriggers, expectedTriggers, "Baseline trigger names differ from captured Production schema.");

console.log(JSON.stringify({
  baseline_schema_column_parity: "PASS",
  source_snapshot_date: snapshot.captured_at_utc,
  tables_checked: expectedTables.length,
  columns_checked: columnsChecked,
  attributes_checked: ["column name", "SQL type", "NOT NULL", "DEFAULT", "column order"],
  constraints_checked: actualConstraints.length,
  indexes_checked: actualIndexes.length,
  policies_checked: actualPolicies.length,
  triggers_checked: actualTriggers.length,
  note: "Compares the baseline with the captured read-only Production schema snapshot; no live Production connection or writes are performed.",
}, null, 2));
