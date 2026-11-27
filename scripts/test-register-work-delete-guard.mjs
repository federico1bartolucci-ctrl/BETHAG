import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deleteRegisterRecordSafely } from "../src/lib/registerRecordDeletion.mjs";
import { loadLinkedWorkLedgerRows } from "../src/lib/workLedgerLinkLookup.mjs";

// Reproduce the previous RegisterPage behavior: a direct table delete bypassed
// the backend guard even when the work had linked accounting records.
const legacyEvents = [];
const legacyDelete = async (table, id, workspaceId) => {
  legacyEvents.push(["direct-delete", table, id, workspaceId]);
  return { error: null };
};
await legacyDelete("condominium_works", "work-1", "workspace-1");
assert.deepEqual(legacyEvents, [
  ["direct-delete", "condominium_works", "work-1", "workspace-1"],
], "The old generic delete path directly deleted a work without invoking domain checks.");

const guardedEvents = [];
let directDeleteCalls = 0;
const linkedAccountingError = new Error("Il lavoro presenta registrazioni contabili collegate.");
await assert.rejects(
  () => deleteRegisterRecordSafely({
    table: "condominium_works",
    id: "work-1",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
    deleteWork: async (workspaceId, id) => {
      guardedEvents.push(["domain-guard", workspaceId, id]);
      throw linkedAccountingError;
    },
    deleteScopedRecord: async () => {
      directDeleteCalls += 1;
      return { data: { id: "work-1" }, error: null };
    },
  }),
  linkedAccountingError,
);
assert.deepEqual(guardedEvents, [["domain-guard", "workspace-1", "work-1"]]);
assert.equal(directDeleteCalls, 0, "A work must never fall through to a direct table delete.");

const successfulWorkEvents = [];
const workResult = await deleteRegisterRecordSafely({
  table: "condominium_works",
  id: "work-2",
  workspaceId: "workspace-1",
  condominiumId: "condominium-1",
  deleteWork: async (workspaceId, id) => {
    successfulWorkEvents.push([workspaceId, id]);
  },
  deleteScopedRecord: async () => {
    throw new Error("Direct delete must not be used for work rows.");
  },
});
assert.deepEqual(workResult, { deleted: true, strategy: "guarded-work-delete" });
assert.deepEqual(successfulWorkEvents, [["workspace-1", "work-2"]]);

for (const table of ["condominium_register_items", "condominium_suppliers"]) {
  const calls = [];
  const result = await deleteRegisterRecordSafely({
    table,
    id: "row-1",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
    deleteWork: async () => {
      throw new Error("Work guard must not be used for this table.");
    },
    deleteScopedRecord: async (scope) => {
      calls.push(scope);
      return { data: { id: "row-1" }, error: null };
    },
  });
  assert.equal(result.deleted, true);
  assert.deepEqual(calls, [{
    table,
    id: "row-1",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
  }]);
}

await assert.rejects(
  () => deleteRegisterRecordSafely({
    table: "condominium_register_items",
    id: "row-missing",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
    deleteScopedRecord: async () => ({ data: null, error: null }),
  }),
  /non trovato|già eliminato/i,
);

const databaseError = new Error("RLS denied");
await assert.rejects(
  () => deleteRegisterRecordSafely({
    table: "condominium_suppliers",
    id: "supplier-1",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
    deleteScopedRecord: async () => ({ data: null, error: databaseError }),
  }),
  databaseError,
);

await assert.rejects(
  () => deleteRegisterRecordSafely({
    table: "condominium_members",
    id: "member-1",
    workspaceId: "workspace-1",
    condominiumId: "condominium-1",
    deleteScopedRecord: async () => ({ data: { id: "member-1" }, error: null }),
  }),
  /non autorizzata/,
);

await assert.rejects(
  () => deleteRegisterRecordSafely({
    table: "condominium_register_items",
    id: "row-1",
    workspaceId: "workspace-1",
    condominiumId: null,
    deleteScopedRecord: async () => ({ data: { id: "row-1" }, error: null }),
  }),
  /Contesto del Registro incompleto/,
);


function ledgerClient(rowsByField, errorsByField = {}) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        assert.equal(table, "condominium_ledger_entries");
        const state = { field: null };
        const query = {
          select(columns) { calls.push(["select", columns]); return query; },
          eq(column, value) { calls.push(["eq", column, value]); return query; },
          contains(column, value) {
            assert.equal(column, "data");
            state.field = Object.keys(value)[0];
            calls.push(["contains", state.field, value[state.field]]);
            return query;
          },
          limit(value) {
            calls.push(["limit", value]);
            return Promise.resolve({
              data: rowsByField[state.field] ?? [],
              error: errorsByField[state.field] ?? null,
            });
          },
        };
        return query;
      },
    },
  };
}

const snakeCaseLedger = { id: "ledger-snake", data: { work_id: "work-snake" } };
const snakeOnlyClient = ledgerClient({ workId: [], work_id: [snakeCaseLedger] });
const legacyCamelOnlyResult = await snakeOnlyClient.client
  .from("condominium_ledger_entries")
  .select("id")
  .eq("workspace_id", "workspace-1")
  .eq("direction", "Uscita")
  .contains("data", { workId: "work-snake" })
  .limit(1);
assert.deepEqual(
  legacyCamelOnlyResult.data,
  [],
  "The previous camelCase-only lookup misses a ledger row stored with work_id.",
);
snakeOnlyClient.calls.length = 0;
const snakeRows = await loadLinkedWorkLedgerRows(snakeOnlyClient.client, "workspace-1", "work-snake");
assert.deepEqual(snakeRows, [snakeCaseLedger]);
assert.ok(snakeOnlyClient.calls.some(call => call[0] === "contains" && call[1] === "workId"));
assert.ok(snakeOnlyClient.calls.some(call => call[0] === "contains" && call[1] === "work_id"));

const camelCaseLedger = { id: "ledger-camel", data: { workId: "work-camel" } };
const camelRows = await loadLinkedWorkLedgerRows(
  ledgerClient({ workId: [camelCaseLedger], work_id: [] }).client,
  "workspace-1",
  "work-camel",
);
assert.deepEqual(camelRows, [camelCaseLedger]);

const noLinkedRows = await loadLinkedWorkLedgerRows(
  ledgerClient({ workId: [], work_id: [] }).client,
  "workspace-1",
  "work-empty",
);
assert.deepEqual(noLinkedRows, []);

const ledgerLookupError = new Error("snake_case lookup failed");
await assert.rejects(
  () => loadLinkedWorkLedgerRows(
    ledgerClient({ workId: [], work_id: [] }, { work_id: ledgerLookupError }).client,
    "workspace-1",
    "work-error",
  ),
  ledgerLookupError,
);

const backendSource = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const deleteWorkStart = backendSource.indexOf("export async function deleteCondominiumWork(");
const deleteWorkEnd = backendSource.indexOf("\nexport async function ", deleteWorkStart + 1);
assert.ok(deleteWorkStart >= 0 && deleteWorkEnd > deleteWorkStart, "deleteCondominiumWork must exist.");
const deleteWorkSection = backendSource.slice(deleteWorkStart, deleteWorkEnd);
assert.match(backendSource, /import \{ loadLinkedWorkLedgerRows \} from "\.\/workLedgerLinkLookup\.mjs"/);
assert.match(deleteWorkSection, /loadLinkedWorkLedgerRows\(supabase,\s*workspaceId,\s*id\)/);
assert.doesNotMatch(deleteWorkSection, /\.contains\("data",\s*\{\s*workId:\s*id\s*\}\)/);
assert.match(deleteWorkSection, /if \(!work\) throw new Error\("Lavoro non trovato o già eliminato: nessuna eliminazione eseguita\."\);/,
  "a missing work must not be treated as a successful idempotent deletion");
assert.match(deleteWorkSection, /\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("id", id\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)/,
  "the final work DELETE must return the row actually deleted");
assert.match(deleteWorkSection, /if \(deleteError\) throw deleteError;/,
  "final DELETE errors must propagate");
assert.match(deleteWorkSection, /if \(!deletedWork\?\.id \|\| String\(deletedWork\.id\) !== String\(id\)\)/,
  "concurrent or RLS-hidden zero-row DELETE must fail closed");

const registerPage = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const removeStart = registerPage.indexOf("async function remove(");
const removeEnd = registerPage.indexOf("\n return <section", removeStart);
assert.ok(removeStart >= 0 && removeEnd > removeStart, "RegisterPage remove handler must exist.");
const removeSection = registerPage.slice(removeStart, removeEnd);
assert.match(registerPage, /import \{ deleteCondominiumWork \} from "\.\/lib\/bethagBackend"/);
assert.match(registerPage, /import \{ deleteRegisterRecordSafely \} from "\.\/lib\/registerRecordDeletion\.mjs"/);
assert.match(removeSection, /deleteRegisterRecordSafely/);
assert.match(removeSection, /deleteWork:\s*deleteCondominiumWork/);
assert.match(removeSection, /\.eq\("condominium_id",\s*condominiumId\)/);
assert.match(removeSection, /\.select\("id"\)\s*\.maybeSingle\(\)/);
assert.doesNotMatch(
  removeSection,
  /from\(table\)\.delete\(\)\.eq\("id",id\)\.eq\("workspace_id",workspaceId\);/,
  "The previous unscoped generic delete must not remain.",
);
assert.ok(
  packageJson.scripts.test.includes("test-register-work-delete-guard.mjs"),
  "Register work deletion regression must be wired into npm test.",
);

console.log("Register work deletion domain-guard runtime regression: PASS");
console.log("Register item/supplier condominium-scope and zero-row deletion regression: PASS");
