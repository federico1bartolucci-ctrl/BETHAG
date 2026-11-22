import assert from "node:assert/strict";
import { fetchWorkDocumentPickerRows, mapWorkDocumentPickerRows } from "../src/lib/work-document-picker.js";

function mockClient(pages) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, columns: null, filters: [], orders: [], range: null };
      return {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        order(column, options) { call.orders.push([column, options]); return this; },
        range(from, to) {
          call.range = [from, to];
          calls.push(call);
          return Promise.resolve(pages[calls.length - 1] ?? { data: [], error: null });
        },
      };
    },
  };
}

const uuid = "4a8e9b73-0e44-4c3b-90a0-3d7a0b2c9e11";
const raw = {
  id: "6a1d8c44-9c65-4f14-a55a-3f6a11c77b33",
  legacy_id: 812,
  workspace_id: "workspace-uuid",
  condominium_id: "condominium-uuid",
  title: "Verbale assemblea",
  category: "Verbali",
  created_at: "2026-11-21T10:20:00Z",
  file_size_bytes: 24576,
  data: { notes: "Nota documento" },
  condominiums: { legacy_id: 42 },
};
const mapped = mapWorkDocumentPickerRows([raw])[0];
assert.deepEqual(mapped, {
  id: 812,
  name: "Verbale assemblea",
  condominiumId: 42,
  category: "Verbali",
  date: "2026-11-21",
  size: "24576",
  notes: "Nota documento",
}, "Picker documents must use legacy IDs matching the link table, not UUIDs.");

const invalidRows = mapWorkDocumentPickerRows([
  { ...raw, legacy_id: null },
  { ...raw, legacy_id: 0 },
  { ...raw, condominiums: null },
  { ...raw, condominiums: [] },
  { ...raw, condominiums: [{ legacy_id: null }] },
]);
assert.deepEqual(invalidRows, [], "Documents without a valid legacy document and condominium ID must not be linkable.");

const firstPage = Array.from({ length: 1000 }, (_, i) => ({
  ...raw,
  legacy_id: i + 1,
  title: "Documento " + (i + 1),
}));
const secondPage = [
  { ...raw, legacy_id: 1001, title: "Documento oltre il limite" },
  { ...raw, legacy_id: 1002, title: "Documento successivo" },
  { ...raw, legacy_id: 1003, title: "Documento finale", condominiums: [{ legacy_id: 43 }] },
];
const client = mockClient([{ data: firstPage, error: null }, { data: secondPage, error: null }]);
const documents = await fetchWorkDocumentPickerRows(client, "workspace-uuid");
assert.equal(documents.length, 1003, "Picker must include documents beyond the default PostgREST page limit.");
assert.equal(documents.find((document) => document.id === 1001)?.name, "Documento oltre il limite");
assert.equal(documents.find((document) => document.id === 1003)?.condominiumId, 43);
assert.deepEqual(client.calls.map((call) => call.range), [[0, 999], [1000, 1999]]);
for (const call of client.calls) {
  assert.equal(call.table, "documents");
  assert.equal(call.filters[0][0], "workspace_id");
  assert.equal(call.filters[0][1], "workspace-uuid");
  assert.deepEqual(call.orders.map((order) => order[0]), ["created_at", "id"]);
}

const failing = mockClient([
  { data: firstPage, error: null },
  { data: null, error: new Error("second-page read failed") },
]);
await assert.rejects(() => fetchWorkDocumentPickerRows(failing, "workspace-uuid"), /second-page read failed/);
assert.equal(failing.calls.length, 2, "A page failure must not return a partial document picker.");

const empty = mockClient([{ data: [], error: null }]);
assert.deepEqual(await fetchWorkDocumentPickerRows(empty, "workspace-uuid"), []);
assert.equal(empty.calls.length, 1);
await assert.rejects(() => fetchWorkDocumentPickerRows(mockClient([]), "workspace-uuid", 0), RangeError);

const registerSource = await (await import("node:fs/promises")).readFile("src/RegisterPage.tsx", "utf8");
assert.match(registerSource, /fetchWorkDocumentPickerRows\(supabase,workspaceId\)/, "Register must use the paginated picker loader.");
assert.match(registerSource, /setDocuments\(documentRows\)/, "Register must store the mapped document picker rows.");
assert.match(registerSource, /documents\.filter\(d=>d\.condominiumId===Number\(selected\)\)/, "Picker must filter mapped rows by legacy condominium ID.");

console.log("PASS: work-document picker maps UUID rows to legacy link IDs, scopes by condominium legacy ID, paginates, and fails closed.");
