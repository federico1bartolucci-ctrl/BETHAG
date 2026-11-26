import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAccountingUnitMembers } from "../src/lib/accountingMemberLookup.mjs";

const successRows = [{ id: 1, unit_id: "unit-1", data: { role: "Proprietario" } }];
const success = await loadAccountingUnitMembers(async () => ({ data: successRows, error: null }));
assert.equal(success.ok, true);
assert.deepEqual(success.data, successRows);
assert.equal(success.error, null);

const returnedError = await loadAccountingUnitMembers(async () => ({
  data: null,
  error: { message: "permission denied" },
}));
assert.equal(returnedError.ok, false);
assert.deepEqual(returnedError.data, []);
assert.equal(returnedError.error, "permission denied");

const rejectedQuery = await loadAccountingUnitMembers(async () => {
  throw new Error("network unavailable");
});
assert.equal(rejectedQuery.ok, false);
assert.deepEqual(rejectedQuery.data, []);
assert.equal(rejectedQuery.error, "network unavailable");

const malformedResponse = await loadAccountingUnitMembers(async () => ({ data: null, error: null }));
assert.equal(malformedResponse.ok, false);
assert.match(malformedResponse.error, /Risposta non valida/);

// The response envelope may be an array while individual rows are malformed.
// The active consumer dereferences member.data and indexes member.unit_id, so
// accepting null/missing-unit rows would still crash or silently mis-group owners.
const nullRowResponse = await loadAccountingUnitMembers(async () => ({ data: [null], error: null }));
assert.equal(nullRowResponse.ok, false);
assert.deepEqual(nullRowResponse.data, []);
assert.match(nullRowResponse.error, /Risposta non valida/);

const missingUnitResponse = await loadAccountingUnitMembers(async () => ({
  data: [{ id: 1, data: { role: "Proprietario" } }],
  error: null,
}));
assert.equal(missingUnitResponse.ok, false);
assert.deepEqual(missingUnitResponse.data, []);
assert.match(missingUnitResponse.error, /Risposta non valida/);

const malformedMetadataResponse = await loadAccountingUnitMembers(async () => ({
  data: [{ id: 1, unit_id: "unit-1", data: [] }],
  error: null,
}));
assert.equal(malformedMetadataResponse.ok, false);
assert.deepEqual(malformedMetadataResponse.data, []);
assert.match(malformedMetadataResponse.error, /Risposta non valida/);

const source = await readFile("src/AccountingPage.tsx", "utf8");
const queryStart = source.indexOf("const unitMembersResult = await loadAccountingUnitMembers");
const queryEnd = source.indexOf("const byUnit = new Map", queryStart);
assert.ok(queryStart >= 0 && queryEnd > queryStart, "unified-installment member lookup must use the guarded loader");
const query = source.slice(queryStart, queryEnd);
assert.match(query, /\.eq\("workspace_id", workspaceId\)/, "unit-member lookup must be workspace-scoped");
assert.match(query, /\.eq\("condominium_id", dbCondominiumId\)/, "unit-member lookup must remain condominium-scoped");
assert.match(query, /\.eq\("active", true\)/, "unit-member lookup must restrict to active members");
assert.match(query, /\.in\("unit_id", unitIds\)/, "unit-member lookup must be limited to selected units");
assert.match(query, /if \(!unitMembersResult\.ok\)\s*\{\s*setError\(unitMembersResult\.error\);\s*return;/);
assert.match(source.slice(queryEnd), /for \(const member of unitMembersResult\.data\)/);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-accounting-members-unit-query-workspace-scope\.mjs/);
console.log("Accounting installment member lookup returned-error runtime regression: PASS");
console.log("Accounting installment member lookup rejected-query runtime regression: PASS");
console.log("Accounting installment member lookup malformed-response runtime regression: PASS");
console.log("Accounting installment member lookup workspace-scope wiring: PASS");
