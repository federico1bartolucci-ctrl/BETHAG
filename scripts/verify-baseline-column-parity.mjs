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
    const defaultMatch = remainder.match(/\bDEFAULT\s+(.+?)(?=\s+NOT NULL\b|$)/i);
  const defaultValue = defaultMatch ? defaultMatch[1].replace(/,$/, "").trim() : null;
  return {
    name,
    type: type.replaceAll('"', "").replace(/\s+/g, " ").trim(),
        notNull: /\bNOT NULL\b/i.test(remainder),
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

const expectedStandaloneIndexes = snapshot.objects.indexes.filter((index) =>
  index.schema === "public" && !constraintBackedIndexNames.has(index.name));
const actualIndexStatements = [...indexesSql.matchAll(/CREATE (?:UNIQUE )?INDEX\b[\s\S]*?;/gi)].map((match) => match[0].trim());
assert.equal(actualIndexStatements.length, expectedStandaloneIndexes.length, "Standalone index definition count differs from Production snapshot.");
const actualIndexDefinitions = new Map(actualIndexStatements.map((statement) => {
  const nameMatch = statement.match(/^CREATE (?:UNIQUE )?INDEX\s+"?([^"\s]+)"?/i);
  assert.ok(nameMatch, "Could not parse index declaration: " + statement.slice(0, 160));
  return [nameMatch[1], normalizeSql(statement)];
}));
const indexDefinitionDifferences = [];
for (const expected of expectedStandaloneIndexes) {
  const actual = actualIndexDefinitions.get(expected.name);
  if (!actual || actual !== normalizeSql(expected.definition)) {
    indexDefinitionDifferences.push({
      name: expected.name,
      expected: normalizeSql(expected.definition),
      actual: actual ?? null,
    });
  }
}
assert.deepEqual(indexDefinitionDifferences, [], "Standalone index definitions differ from captured Production semantics.");



const expectedPolicies = snapshot.objects.policies.filter((policy) => policy.schema === "public").map((policy) => policy.name).sort();
const actualPolicies = [...securitySql.matchAll(/^CREATE POLICY "([^"]+)"/gm)].map((match) => match[1]).sort();
assert.deepEqual(actualPolicies, expectedPolicies, "Baseline RLS policy names differ from captured Production schema.");

const expectedTriggers = snapshot.objects.triggers.filter((trigger) => trigger.schema === "public").map((trigger) => trigger.name).sort();
const actualTriggers = [...securitySql.matchAll(/^CREATE (?:CONSTRAINT )?TRIGGER "?([^" ]+)"?/gm)].map((match) => match[1]).sort();
assert.deepEqual(actualTriggers, expectedTriggers, "Baseline trigger names differ from captured Production schema.");


function normalizeSql(value) {
  return value
    .replace(/"((?:""|[^"])*)"/g, (_, identifier) => identifier.replace(/""/g, '"'))
    .replace(/\bpublic\./gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),;])\s*/g, "$1")
    .trim()
    .replace(/;$/, "")
    .toLowerCase();
}

function readBalancedParentheses(text, openIndex) {
  assert.equal(text[openIndex], "(", "Expected opening parenthesis.");
  let depth = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (singleQuoted) {
      if (char === "'" && next === "'") { i += 1; continue; }
      if (char === "'") singleQuoted = false;
      continue;
    }
    if (doubleQuoted) {
      if (char === '"' && next === '"') { i += 1; continue; }
      if (char === '"') doubleQuoted = false;
      continue;
    }
    if (char === "'") { singleQuoted = true; continue; }
    if (char === '"') { doubleQuoted = true; continue; }
    if (char === "(") depth += 1;
    if (char === ")" && --depth === 0) return { value: text.slice(openIndex + 1, i), end: i + 1 };
  }
  assert.fail("Unbalanced SQL parentheses.");
}

function parsePolicy(statement) {
  const header = statement.match(/^CREATE POLICY "((?:""|[^"])*)" ON "([^"]+)"\."([^"]+)" AS (PERMISSIVE|RESTRICTIVE) FOR (ALL|SELECT|INSERT|UPDATE|DELETE) TO (.+?)\s+(USING|WITH CHECK)\s*\(/i);
  assert.ok(header, "Could not parse policy declaration: " + statement.slice(0, 140));
  const [, name, schema, table, permissive, command, roleText, firstClause] = header;
  const roles = roleText.split(",").map((role) => role.trim().replace(/^"|"$/g, "").toLowerCase()).sort();
  let cursor = header[0].length - 1;
  const first = readBalancedParentheses(statement, cursor);
  let using = null, check = null;
  if (firstClause.toUpperCase() === "USING") using = first.value;
  else check = first.value;
  cursor = first.end;
  const rest = statement.slice(cursor).trim().replace(/;\s*$/, "");
  if (rest) {
    const next = rest.match(/^(USING|WITH CHECK)\s*\(/i);
    assert.ok(next, "Unexpected trailing policy SQL for " + name + ": " + rest);
    const open = cursor + statement.slice(cursor).search(/\S/) + next[0].lastIndexOf("(");
    const parsed = readBalancedParentheses(statement, open);
    if (next[1].toUpperCase() === "USING") using = parsed.value;
    else check = parsed.value;
    assert.equal(statement.slice(parsed.end).trim().replace(/;$/, ""), "", "Unexpected trailing policy text for " + name);
  }
  return { name: name.replace(/""/g, '"'), schema, table, permissive, command, roles, using, check };
}

const policyStatements = [...securitySql.matchAll(/CREATE POLICY\s+"(?:""|[^"])*"\s+ON\s+"[^"]+"\."[^"]+"\s+AS\s+(?:PERMISSIVE|RESTRICTIVE)\b[\s\S]*?;/g)].map((match) => match[0].trim());
const actualPolicyDefinitions = policyStatements.map(parsePolicy);
const expectedPolicyDefinitions = snapshot.objects.policies.filter((policy) => policy.schema === "public");
assert.equal(actualPolicyDefinitions.length, expectedPolicyDefinitions.length, "Policy definition count differs from Production snapshot.");
const actualPoliciesByName = new Map(actualPolicyDefinitions.map((policy) => [policy.name, policy]));
const policyDefinitionDifferences = [];
for (const expected of expectedPolicyDefinitions) {
  const actual = actualPoliciesByName.get(expected.name);
  if (!actual) {
    policyDefinitionDifferences.push({ name: expected.name, reason: "missing declaration" });
    continue;
  }
  const comparable = {
    schema: actual.schema,
    table: actual.table,
    permissive: actual.permissive.toUpperCase(),
    command: actual.command.toUpperCase(),
    roles: actual.roles,
    using: actual.using === null ? null : normalizeSql(actual.using),
    check: actual.check === null ? null : normalizeSql(actual.check),
  };
  const wanted = {
    schema: expected.schema,
    table: expected.table,
    permissive: expected.permissive.toUpperCase(),
    command: expected.command.toUpperCase(),
    roles: [...expected.roles].map((role) => role.toLowerCase()).sort(),
    using: expected.using === null ? null : normalizeSql(expected.using),
    check: expected.check === null ? null : normalizeSql(expected.check),
  };
  if (JSON.stringify(comparable) !== JSON.stringify(wanted)) {
    policyDefinitionDifferences.push({ name: expected.name, expected: wanted, actual: comparable });
  }
}
assert.deepEqual(policyDefinitionDifferences, [], "RLS policy definitions differ from captured Production semantics.");

const triggerStatements = securitySql.split(/\n/).map((line) => line.trim()).filter((line) => /^CREATE (?:CONSTRAINT )?TRIGGER\b/i.test(line));
const expectedTriggerDefinitions = snapshot.objects.triggers.filter((trigger) => trigger.schema === "public");
assert.equal(triggerStatements.length, expectedTriggerDefinitions.length, "Trigger definition count differs from Production snapshot.");
const triggerDifferences = [];
const triggerKey = (schema, table, name) => schema + "." + table + "." + name;
const actualTriggersByKey = new Map(triggerStatements.map((statement) => {
  const nameMatch = statement.match(/^CREATE (?:CONSTRAINT )?TRIGGER "?([^"\s]+)"?/i);
  const tableMatch = statement.match(/\sON\s+(?:"public"\.)?"?([^"\s.]+)"?\s/i);
  assert.ok(nameMatch && tableMatch, "Could not parse trigger declaration: " + statement.slice(0, 160));
  return [triggerKey("public", tableMatch[1], nameMatch[1]), statement];
}));
for (const expected of expectedTriggerDefinitions) {
  const key = triggerKey(expected.schema, expected.table, expected.name);
  const actual = actualTriggersByKey.get(key);
  if (!actual || normalizeSql(actual) !== normalizeSql(expected.definition)) {
    triggerDifferences.push({ key, expected: normalizeSql(expected.definition), actual: actual ? normalizeSql(actual) : null });
  }
}
assert.deepEqual(triggerDifferences, [], "Trigger definitions differ from captured Production semantics.");

const expectedConstraintDefinitions = expectedTables.flatMap((table) => table.constraints
  .filter((constraint) => constraint.type !== "t")
  .map((constraint) => ({ table: table.table_name, ...constraint })));
const constraintStatements = [...sql.matchAll(/^ALTER TABLE "public"\."([^"]+)" ADD CONSTRAINT "([^"]+)" ([\s\S]*?);$/gm)];
assert.equal(constraintStatements.length, expectedConstraintDefinitions.length, "Constraint definition count differs from Production snapshot.");
const actualConstraintDefinitions = new Map(constraintStatements.map((match) => [
  match[1] + "." + match[2],
  normalizeSql(match[3]),
]));
const constraintDifferences = [];
for (const expected of expectedConstraintDefinitions) {
  const key = expected.table + "." + expected.name;
  const actual = actualConstraintDefinitions.get(key);
  if (actual !== normalizeSql(expected.definition)) {
    constraintDifferences.push({ key, expected: normalizeSql(expected.definition), actual: actual ?? null });
  }
}
assert.deepEqual(constraintDifferences, [], "Constraint definitions differ from captured Production semantics.");

const expectedViews = snapshot.objects.views.filter((view) => view.schema === "public");
const actualViewStatements = [...indexesSql.matchAll(/CREATE OR REPLACE VIEW "public"\."([^"]+)"(?:\s+WITH\s*\(([^)]*)\))?\s+AS\s+([\s\S]*?);/gi)];
assert.equal(actualViewStatements.length, expectedViews.length, "View definition count differs from Production snapshot.");
const viewDifferences = [];
for (const expected of expectedViews) {
  const actual = actualViewStatements.find((match) => match[1] === expected.name);
  if (!actual) {
    viewDifferences.push({ name: expected.name, reason: "missing declaration" });
    continue;
  }
  const actualOptions = (actual[2] ?? "").split(",").map((option) => option.replace(/\s+/g, "").toLowerCase()).filter(Boolean).sort();
  const expectedOptions = [...(expected.options ?? [])].map((option) => option.replace(/\s+/g, "").toLowerCase()).sort();
  const actualDefinition = normalizeSql(actual[3]);
  const expectedDefinition = normalizeSql(expected.definition);
  if (JSON.stringify(actualOptions) !== JSON.stringify(expectedOptions) || actualDefinition !== expectedDefinition) {
    viewDifferences.push({ name: expected.name, expectedOptions, actualOptions, expectedDefinition, actualDefinition });
  }
}
assert.deepEqual(viewDifferences, [], "View definitions or security options differ from captured Production semantics.");

console.log(JSON.stringify({
  baseline_schema_column_parity: "PASS",
  semantic_policy_parity: "PASS",
  semantic_trigger_parity: "PASS",
  semantic_constraint_parity: "PASS",
  semantic_view_parity: "PASS",
  semantic_index_parity: "PASS",
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
