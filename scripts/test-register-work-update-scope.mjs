import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateRegisterWorkWithinScope } from "../src/lib/registerWorkUpdateScope.mjs";

function mockClient({ data = { id: "work-1" }, error = null } = {}) {
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

const payload = {
  workspace_id: "workspace-a",
  condominium_id: "condominium-a",
  title: "Revisione ascensore",
};
const common = {
  currentWorkspaceId: "workspace-a",
  currentCondominiumId: "condominium-a",
  currentSelectedCondominium: 10,
  originalWorkspaceId: "workspace-a",
  originalCondominiumId: "condominium-a",
  originalSelectedCondominium: 10,
  workId: "work-1",
  payload,
};

const valid = mockClient();
assert.deepEqual(
  await updateRegisterWorkWithinScope({ client: valid.client, ...common }),
  { id: "work-1" },
);
assert.deepEqual(valid.calls, [
  ["from", "condominium_works"],
  ["update", payload],
  ["eq", "id", "work-1"],
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "condominium_id", "condominium-a"],
  ["select", "id"],
  ["maybeSingle"],
]);

// Reproduce a stale form after selection changes while the resolved DB ID is
// still the previous condominium.
const selectionChangedBeforeResolver = mockClient();
await assert.rejects(
  updateRegisterWorkWithinScope({
    client: selectionChangedBeforeResolver.client,
    ...common,
    currentSelectedCondominium: 20,
    currentCondominiumId: "condominium-a",
  }),
  /condominio selezionato è cambiato/,
);
assert.deepEqual(selectionChangedBeforeResolver.calls, []);

const resolvedCondominiumChanged = mockClient();
await assert.rejects(
  updateRegisterWorkWithinScope({
    client: resolvedCondominiumChanged.client,
    ...common,
    currentSelectedCondominium: 20,
    currentCondominiumId: "condominium-b",
  }),
  /condominio selezionato è cambiato/,
);
assert.deepEqual(resolvedCondominiumChanged.calls, []);

const workspaceChanged = mockClient();
await assert.rejects(
  updateRegisterWorkWithinScope({
    client: workspaceChanged.client,
    ...common,
    currentWorkspaceId: "workspace-b",
  }),
  /workspace o il condominio selezionato è cambiato/,
);
assert.deepEqual(workspaceChanged.calls, []);

const crossScopePayload = mockClient();
await assert.rejects(
  updateRegisterWorkWithinScope({
    client: crossScopePayload.client,
    ...common,
    payload: { ...payload, condominium_id: "condominium-b" },
  }),
  /Payload fuori ambito/,
);
assert.deepEqual(crossScopePayload.calls, []);

// A PostgREST UPDATE filtered by RLS or a concurrent deletion may return no
// row without an error. The old handler ignored this outcome; it must now fail.
const zeroRows = mockClient({ data: null });
await assert.rejects(
  updateRegisterWorkWithinScope({ client: zeroRows.client, ...common }),
  /nessuna modifica eseguita/,
);

const mismatchedRow = mockClient({ data: { id: "another-work" } });
await assert.rejects(
  updateRegisterWorkWithinScope({ client: mismatchedRow.client, ...common }),
  /nessuna modifica eseguita/,
);

const queryError = mockClient({ data: null, error: new Error("RLS denied update") });
await assert.rejects(
  updateRegisterWorkWithinScope({ client: queryError.client, ...common }),
  /RLS denied update/,
);

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const saveStart = source.indexOf("async function saveWork(");
const saveEnd = source.indexOf("async function createWorkActivity", saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart, "Register work save handler must exist.");
const saveHandler = source.slice(saveStart, saveEnd);
assert.match(saveHandler, /updateRegisterWorkWithinScope/);
assert.match(saveHandler, /editingWorkScope\.selectedCondominium/);
assert.doesNotMatch(saveHandler, /\.from\("condominium_works"\)\.update\(payload\)/);
assert.match(saveHandler, /setEditingWorkScope\(null\)/);
assert.match(
  source,
  /setEditingWorkScope\(\{id:w\.id,workspaceId,condominiumId:w\.condominium_id,selectedCondominium:selected\}\)/,
  "Opening an existing work must capture its original workspace and condominium.",
);
assert.match(
  source,
  /onClick=\{\(\)=>\{setEditingWork\(null\);setEditingWorkScope\(null\);setShowWorkForm\(true\)\}\}/,
  "Creating a new work must clear any previous edit scope.",
);
assert.match(
  source,
  /onClick=\{\(\)=>\{setEditingWork\(null\);setEditingWorkScope\(null\);setShowWorkForm\(false\)\}\}/,
  "Cancelling the work form must clear the captured edit scope.",
);
assert.equal(
  (packageJson.scripts.test.match(/test-register-work-update-scope\.mjs/g) || []).length,
  1,
  "The runtime regression must be registered exactly once in npm test.",
);

console.log("Register work update original-scope and zero-row runtime regression: PASS");
