import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateRegisterSupplierWithinScope } from "../src/lib/registerSupplierUpdateScope.mjs";

function mockClient({ data = { id: "supplier-1" }, error = null } = {}) {
  const calls = [];
  const query = {
    eq(column, value) { calls.push(["eq", column, value]); return query; },
    select(columns) { calls.push(["select", columns]); return query; },
    maybeSingle() { calls.push(["maybeSingle"]); return Promise.resolve({ data, error }); },
  };
  const client = {
    from(table) { calls.push(["from", table]); return { update(payload) { calls.push(["update", payload]); return query; } }; },
  };
  return { client, calls };
}
const payload = { workspace_id: "workspace-a", condominium_id: "condominium-a", business_name: "Supplier A" };
const valid = mockClient();
const row = await updateRegisterSupplierWithinScope({
  client: valid.client, currentWorkspaceId: "workspace-a", currentCondominiumId: "condominium-a",
  originalWorkspaceId: "workspace-a", originalCondominiumId: "condominium-a", supplierId: "supplier-1", payload,
});
assert.deepEqual(row, { id: "supplier-1" });
assert.deepEqual(valid.calls, [
  ["from", "condominium_suppliers"],
  ["update", payload],
  ["eq", "id", "supplier-1"],
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "condominium_id", "condominium-a"],
  ["select", "id"],
  ["maybeSingle"],
]);

const condoSwitch = mockClient();
await assert.rejects(
  updateRegisterSupplierWithinScope({
    client: condoSwitch.client, currentWorkspaceId: "workspace-a", currentCondominiumId: "condominium-b",
    originalWorkspaceId: "workspace-a", originalCondominiumId: "condominium-a", supplierId: "supplier-1", payload,
  }),
  /condominio è cambiato/,
);
assert.deepEqual(condoSwitch.calls, [], "Context mismatch must stop before any database query.");

const workspaceSwitch = mockClient();
await assert.rejects(
  updateRegisterSupplierWithinScope({
    client: workspaceSwitch.client, currentWorkspaceId: "workspace-b", currentCondominiumId: "condominium-a",
    originalWorkspaceId: "workspace-a", originalCondominiumId: "condominium-a", supplierId: "supplier-1", payload,
  }),
  /workspace o il condominio è cambiato/,
);
assert.deepEqual(workspaceSwitch.calls, [], "Workspace mismatch must stop before any database query.");

const zeroRows = mockClient({ data: null });
await assert.rejects(
  updateRegisterSupplierWithinScope({
    client: zeroRows.client, currentWorkspaceId: "workspace-a", currentCondominiumId: "condominium-a",
    originalWorkspaceId: "workspace-a", originalCondominiumId: "condominium-a", supplierId: "supplier-1", payload,
  }),
  /nessuna modifica eseguita/,
);

const failedQuery = mockClient({ data: null, error: new Error("update rejected") });
await assert.rejects(
  updateRegisterSupplierWithinScope({
    client: failedQuery.client, currentWorkspaceId: "workspace-a", currentCondominiumId: "condominium-a",
    originalWorkspaceId: "workspace-a", originalCondominiumId: "condominium-a", supplierId: "supplier-1", payload,
  }),
  /update rejected/,
);

const source = await readFile("src/RegisterPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const start = source.indexOf("async function saveSupplier(e:React.FormEvent)");
const end = source.indexOf("async function openWorkDocuments", start);
assert.ok(start >= 0 && end > start, "Supplier save handler must exist and remain delimited.");
const handler = source.slice(start, end);
assert.match(handler, /updateRegisterSupplierWithinScope/, "Supplier edits must use the scoped helper.");
assert.match(handler, /editingSupplierWorkspaceId/, "Edit must preserve original workspace context.");
assert.match(handler, /editingSupplierCondominiumId/, "Edit must preserve original condominium context.");
assert.match(source, /setEditingSupplierWorkspaceId\(workspaceId\);setEditingSupplierCondominiumId\(x\.condominium_id\)/, "Edit button must capture supplier scope.");
assert.ok(packageJson.scripts.test.includes("test-register-supplier-update-scope.mjs"), "Regression must be wired into npm test.");
console.log("Register supplier update scope runtime regression: PASS");
