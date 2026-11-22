import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findExistingAllocationIntake } from "../src/lib/allocationIntakeDocumentLookup.mjs";

function mockClient(responses) {
  const calls = [];
  let next = 0;
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], limit: null };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push(["eq", column, value]); return query; },
        neq(column, value) { state.filters.push(["neq", column, value]); return query; },
        limit(value) { state.limit = value; return query; },
        maybeSingle() {
          calls.push({ ...state, filters: state.filters.slice() });
          const response = responses[next++];
          assert.ok(response, `Unexpected query for ${table}`);
          return Promise.resolve(response);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

// Reproduce the ignored document-query error: the old caller continued with a null
// document ID and could persist a duplicate, unlinked intake. The helper must fail
// before querying the intake table so the caller's insert is never reached.
const failedDocumentLookup = mockClient([{ data: null, error: new Error("temporary document lookup failure") }]);
await assert.rejects(
  findExistingAllocationIntake(failedDocumentLookup.client, "workspace-a", 42),
  /Allocation intake document lookup failed: temporary document lookup failure/,
);
assert.deepEqual(failedDocumentLookup.calls.map((call) => call.table), ["documents"]);
assert.deepEqual(failedDocumentLookup.calls[0].filters, [
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "legacy_id", 42],
]);

// Successful document lookup with no prior intake.
const fresh = mockClient([
  { data: { id: "document-db-42" }, error: null },
  { data: null, error: null },
]);
assert.deepEqual(await findExistingAllocationIntake(fresh.client, "workspace-a", 42), {
  documentId: "document-db-42",
  existingIntake: null,
});
assert.deepEqual(fresh.calls.map((call) => call.table), ["documents", "condominium_allocation_intakes"]);
assert.deepEqual(fresh.calls[1].filters, [
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "document_id", "document-db-42"],
  ["neq", "status", "Annullato"],
]);
assert.equal(fresh.calls[1].limit, 1);

// Existing non-cancelled intake is detected.
const duplicate = mockClient([
  { data: { id: "document-db-42" }, error: null },
  { data: { id: "intake-existing", status: "Da verificare" }, error: null },
]);
assert.deepEqual(await findExistingAllocationIntake(duplicate.client, "workspace-a", 42), {
  documentId: "document-db-42",
  existingIntake: { id: "intake-existing", status: "Da verificare" },
});

// Missing DB document preserves the existing nullable association behavior.
const missingDocument = mockClient([{ data: null, error: null }]);
assert.deepEqual(await findExistingAllocationIntake(missingDocument.client, "workspace-a", 42), {
  documentId: null,
  existingIntake: null,
});
assert.deepEqual(missingDocument.calls.map((call) => call.table), ["documents"]);

// Existing-intake query errors are also propagated, preventing a blind insert.
const failedDuplicateLookup = mockClient([
  { data: { id: "document-db-42" }, error: null },
  { data: null, error: new Error("intake query failed") },
]);
await assert.rejects(
  findExistingAllocationIntake(failedDuplicateLookup.client, "workspace-a", 42),
  /Allocation intake duplicate lookup failed: intake query failed/,
);
assert.deepEqual(failedDuplicateLookup.calls.map((call) => call.table), ["documents", "condominium_allocation_intakes"]);

await assert.rejects(findExistingAllocationIntake(null, "workspace-a", 42), /requires a client and workspace ID/);
await assert.rejects(findExistingAllocationIntake(fresh.client, " ", 42), /requires a client and workspace ID/);

// Verify the production integration and test command wiring. These assertions run
// against the actual files in GitHub Actions; a tiny fixture is used locally.
const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(mainSource, /import\s*\{\s*findExistingAllocationIntake\s*\}\s*from\s*["']\.\/lib\/allocationIntakeDocumentLookup\.mjs["']/);
const ripartoStart = mainSource.indexOf('if (document.aiDocumentType === "Riparto spese" && extracted)');
const invoiceStart = mainSource.indexOf('if (document.aiDocumentType === "Fattura" && extracted)', ripartoStart);
assert.ok(ripartoStart >= 0 && invoiceStart > ripartoStart, "AI riparto branch must be present and bounded");
const ripartoBranch = mainSource.slice(ripartoStart, invoiceStart);
assert.match(ripartoBranch, /await findExistingAllocationIntake\(supabase, workspaceId, document\.id\)/);
assert.match(ripartoBranch, /document_id:\s*dbDocumentId/);
assert.doesNotMatch(ripartoBranch, /const\s*\{\s*data:\s*dbDocument\s*\}\s*=\s*await supabase/);
assert.ok(ripartoBranch.indexOf("findExistingAllocationIntake") < ripartoBranch.indexOf('.from("condominium_allocation_intakes").insert'));
assert.ok(packageJson.scripts.test.includes("test-allocation-intake-document-lookup-errors.mjs"), "Runtime regression must be wired into npm test");

console.log("Allocation intake document lookup runtime regression: PASS");
