import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deleteRegisterRecordSafely } from "../src/lib/registerRecordDeletion.mjs";

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
  /nessuna modifica|non trovato|già eliminato/i,
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

const registerPage = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const removeStart = registerPage.indexOf("async function remove(");
const removeEnd = registerPage.indexOf("\\n return <section", removeStart);
assert.ok(removeStart >= 0 && removeEnd > removeStart, "RegisterPage remove handler must exist.");
const removeSection = registerPage.slice(removeStart, removeEnd);
assert.match(registerPage, /import \\{ deleteCondominiumWork \\} from "\\.\\/lib\\/bethagBackend"/);
assert.match(registerPage, /import \\{ deleteRegisterRecordSafely \\} from "\\.\\/lib\\/registerRecordDeletion\\.mjs"/);
assert.match(removeSection, /deleteRegisterRecordSafely/);
assert.match(removeSection, /deleteWork:\\s*deleteCondominiumWork/);
assert.match(removeSection, /\\.eq\\("condominium_id",\\s*condominiumId\\)/);
assert.match(removeSection, /\\.select\\("id"\\)\\.maybeSingle\\(\\)/);
assert.doesNotMatch(
  removeSection,
  /from\\(table\\)\\.delete\\(\\)\\.eq\\("id",id\\)\\.eq\\("workspace_id",workspaceId\\);/,
  "The previous unscoped generic delete must not remain.",
);
assert.ok(
  packageJson.scripts.test.includes("test-register-work-delete-guard.mjs"),
  "Register work deletion regression must be wired into npm test.",
);

console.log("Register work deletion domain-guard runtime regression: PASS");
console.log("Register item/supplier condominium-scope and zero-row deletion regression: PASS");
