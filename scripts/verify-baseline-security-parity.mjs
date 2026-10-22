import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = "supabase/rebuild";
const migrations = "supabase/migrations";
const [catalogA, catalogB, accessCatalog, functionSql, grantSql] = await Promise.all([
  readFile(`${root}/production-functions-01-90.json`, "utf8").then(JSON.parse),
  readFile(`${root}/production-functions-91-171.json`, "utf8").then(JSON.parse),
  readFile(`${root}/production-access-catalog-corrected-20261017.json`, "utf8").then(JSON.parse),
  readFile(`${migrations}/20261017000003_bethag_baseline_functions.sql`, "utf8"),
  readFile(`${migrations}/20261017000005_bethag_baseline_grants.sql`, "utf8"),
]);

assert.equal(catalogA.project_ref, accessCatalog.project_ref);
assert.equal(catalogB.project_ref, accessCatalog.project_ref);

const productionFunctions = [...catalogA.functions, ...catalogB.functions];
assert.equal(productionFunctions.length, 171, "Expected 171 captured Production functions.");
const key = (schema, name) => `${schema}.${name}`;
const expectedByKey = new Map(productionFunctions.map((fn) => [key(fn.schema_name, fn.name), fn]));
assert.equal(expectedByKey.size, productionFunctions.length, "Production snapshot contains overloaded/duplicate function names; strengthen signature matching.");

const actualFunctions = [];
const declaration = /CREATE OR REPLACE FUNCTION\s+("?\w+"?)\.("?\w+"?)\s*\(/g;
for (const match of functionSql.matchAll(declaration)) {
  const start = match.index;
  const bodyStart = functionSql.indexOf("AS $function$", start);
  assert.notEqual(bodyStart, -1, `Function declaration has no AS $function$: ${match[0]}`);
  const header = functionSql.slice(start, bodyStart);
  const schema = match[1].replaceAll('"', "");
  const name = match[2].replaceAll('"', "");
  const pathMatch = header.match(/SET\s+search_path\s+(?:TO|=)\s*([^;\n]+)/i);
  const normalizePath = (value) => value.split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, "").trim()).join(",");
  actualFunctions.push({
    key: key(schema, name),
    securityDefiner: /\bSECURITY\s+DEFINER\b/i.test(header),
    searchPath: pathMatch ? normalizePath(pathMatch[1]) : null,
  });
}
assert.equal(actualFunctions.length, productionFunctions.length, "Baseline function count differs from Production snapshot.");
assert.equal(new Set(actualFunctions.map((fn) => fn.key)).size, actualFunctions.length, "Baseline has duplicate function names.");
const actualByKey = new Map(actualFunctions.map((fn) => [fn.key, fn]));

const missingFunctions = [...expectedByKey.keys()].filter((name) => !actualByKey.has(name));
const unexpectedFunctions = [...actualByKey.keys()].filter((name) => !expectedByKey.has(name));
assert.deepEqual(missingFunctions, [], "Baseline is missing functions present in the captured Production catalog.");
assert.deepEqual(unexpectedFunctions, [], "Baseline contains functions absent from the captured Production catalog.");

const securityMismatches = [];
const searchPathMismatches = [];
for (const [name, expected] of expectedByKey) {
  const actual = actualByKey.get(name);
  assert.ok(actual, `Baseline function missing: ${name}`);
  if (actual.securityDefiner !== expected.security_definer) {
    securityMismatches.push({ function: name, production: expected.security_definer, baseline: actual.securityDefiner });
  }
  const expectedPathEntry = (expected.config ?? []).find((entry) => entry.startsWith("search_path="));
  const expectedPath = expectedPathEntry ? expectedPathEntry.slice("search_path=".length).split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, "").trim()).join(",") : null;
  if (actual.searchPath !== expectedPath) {
    searchPathMismatches.push({ function: name, production: expectedPath, baseline: actual.searchPath });
  }
}
assert.deepEqual(securityMismatches, [], "SECURITY DEFINER settings differ from the captured Production catalog.");
assert.deepEqual(searchPathMismatches, [], "Function search_path settings differ from the captured Production catalog.");

const productionFunctionGrants = accessCatalog.objects.functionGrants
  .filter((grant) => grant.grantee !== "postgres")
  .map((grant) => `${grant.schema}.${grant.function}|${grant.grantee}|${Boolean(grant.grantable)}`)
  .sort();
const baselineGrantLines = grantSql.split("\n").filter((line) => /^GRANT EXECUTE ON FUNCTION /i.test(line));
const parsedBaselineGrants = baselineGrantLines.map((line) => {
  const match = line.match(/^GRANT EXECUTE ON FUNCTION "?([^".]+)"?\."?([^"(]+)"?\([^)]*\) TO ([^;]+);$/i);
  assert.ok(match, `Cannot parse function grant: ${line}`);
  const recipient = match[3].replace(/ WITH GRANT OPTION/i, "").trim();
  return `${match[1]}.${match[2]}|${recipient}|${/WITH GRANT OPTION/i.test(match[3])}`;
}).sort();
assert.equal(productionFunctionGrants.length, 218, "Captured Production function grant count changed.");
assert.equal(parsedBaselineGrants.length, productionFunctionGrants.length, "Function EXECUTE grant count differs from Production.");
assert.deepEqual(parsedBaselineGrants, productionFunctionGrants, "Function EXECUTE grants differ from the captured Production catalog.");

console.log(JSON.stringify({
  baseline_security_parity: "PASS",
  captured_production_functions: productionFunctions.length,
  security_definer_settings_checked: productionFunctions.length,
  search_path_settings_checked: productionFunctions.length,
  function_execute_grants_checked: productionFunctionGrants.length,
  source_snapshot_date: accessCatalog.captured_at_utc,
  note: "Compares the baseline with the captured read-only Production catalog from 2026-10-17; it does not query live Production or perform a deployment.",
}, null, 2));
