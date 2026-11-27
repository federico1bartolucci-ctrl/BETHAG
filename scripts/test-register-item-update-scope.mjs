import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateRegisterItemWithinScope } from "../src/lib/registerItemUpdateScope.mjs";

function mockClient({ data = { id: "item-1" }, error = null } = {}) {
  const calls = [];
  const query = {
    eq(column, value) { calls.push(["eq", column, value]); return query; },
    select(columns) { calls.push(["select", columns]); return query; },
    maybeSingle() { calls.push(["maybeSingle"]); return Promise.resolve({ data, error }); },
  };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return { update(payload) { calls.push(["update", payload]); return query; } };
    },
  };
  return { client, calls };
}

const payload = { workspace_id: "workspace-a", condominium_id: "condominium-a", title: "Revisione ascensore" };
const common = {
  currentWorkspaceId: "workspace-a",
  currentCondominiumId: "condominium-a",
  currentSelectedCondominium: 10,
  originalWorkspaceId: "workspace-a",
  originalCondominiumId: "condominium-a",
  originalSelectedCondominium: 10,
  itemId: "item-1",
  payload,
};

const valid = mockClient();
assert.deepEqual(await updateRegisterItemWithinScope({ client: valid.client, ...common }), { id: "item-1" });
assert.deepEqual(valid.calls, [
  ["from", "condominium_register_items"],
  ["update", payload],
  ["eq", "id", "item-1"],
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "condominium_id", "condominium-a"],
  ["select", "id"],
  ["maybeSingle"],
]);

// Reproduce the race where the user has selected condominium B but the
// asynchronous resolver still exposes condominium A's previous DB ID.
const selectionChangedBeforeResolver = mockClient();
await assert.rejects(
  updateRegisterItemWithinScope({
    client: selectionChangedBeforeResolver.client,
    ...common,
    currentSelectedCondominium: 20,
    currentCondominiumId: "condominium-a",
  }),
  /condominio selezionato è cambiato/,
);
assert.deepEqual(selectionChangedBeforeResolver.calls, [], "Selection mismatch must stop before any database query.");

const resolvedCondominiumChanged = mockClient();
await assert.rejects(
  updateRegisterItemWithinScope({
    client: resolvedCondominiumChanged.client,
    ...common,
    currentSelectedCondominium: 20,
    currentCondominiumId: "condominium-b",
  }),
  /condominio selezionato è cambiato/,
);
assert.deepEqual(resolvedCondominiumChanged.calls, [], "Resolved condominium mismatch must stop before any database query.");

const workspaceChanged = mockClient();
await assert.rejects(
  updateRegisterItemWithinScope({
    client: workspaceChanged.client,
    ...common,
    currentWorkspaceId: "workspace-b",
  }),
  /workspace o il condominio selezionato è cambiato/,
);
assert.deepEqual(workspaceChanged.calls, [], "Workspace mismatch must stop before any database query.");

const crossScopePayload = mockClient();
await assert.rejects(
  updateRegisterItemWithinScope({
    client: crossScopePayload.client,
    ...common,
    payload: { ...payload, condominium_id: "condominium-b" },
  }),
  /Payload fuori ambito/,
);
assert.deepEqual(crossScopePayload.calls, [], "Cross-condominium payload must be rejected before querying.");

const zeroRows = mockClient({ data: null });
await assert.rejects(
  updateRegisterItemWithinScope({ client: zeroRows.client, ...common }),
  /nessuna modifica eseguita/,
);

const mismatchedRow = mockClient({ data: { id: "another-item" } });
await assert.rejects(
  updateRegisterItemWithinScope({ client: mismatchedRow.client, ...common }),
  /nessuna modifica eseguita/,
);

const queryError = mockClient({ data: null, error: new Error("RLS denied update") });
await assert.rejects(
  updateRegisterItemWithinScope({ client: queryError.client, ...common }),
  /RLS denied update/,
);

const source = await readFile("src/RegisterPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const start = source.indexOf("async function saveItem(e:React.FormEvent)");
const end = source.indexOf("async function saveSupplier", start);
assert.ok(start >= 0 && end > start, "Register item save handler must exist and remain delimited.");
const handler = source.slice(start, end);
assert.match(handler, /updateRegisterItemWithinScope/, "Existing register item edits must use the scoped helper.");
assert.match(handler, /editingItemScope\.selectedCondominium/, "Save must validate the original selected condominium.");
assert.ok(source.includes("setEditingItemScope({id:x.id,workspaceId,condominiumId:x.condominium_id,selectedCondominium:selected})"), "Edit must capture original workspace, condominium and selected context.");
assert.match(source, /setEditingItemScope\(null\)/, "New, saved and cancelled forms must clear stale edit scope.");
assert.ok(packageJson.scripts.test.includes("test-register-item-update-scope.mjs"), "Regression must be wired into npm test.");

console.log("Register item update condominium/workspace scope runtime regression: PASS");
