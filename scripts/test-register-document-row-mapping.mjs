import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapRegisterDocumentRows } from "../src/lib/registerDocumentRows.mjs";

const workspaceId = "10000000-0000-4000-8000-000000000001";
const condominiumId = "20000000-0000-4000-8000-000000000001";
const rawRow = {
  id: "30000000-0000-4000-8000-000000000001",
  workspace_id: workspaceId,
  condominium_id: condominiumId,
  legacy_id: 412,
  title: "Verbale assemblea",
  category: "Assemblee",
  created_at: "2026-11-26T08:00:00.000Z",
  file_size_bytes: 2048,
  data: { notes: "Documento verificato" },
};

// Reproduce the previous UI mismatch: raw PostgREST rows are snake_case,
// their primary key is UUID, and the work-document relation expects legacy_id.
assert.equal(rawRow.condominiumId, undefined);
assert.notEqual(rawRow.id, 412);
assert.equal(
  [rawRow].filter((document) => document.condominiumId === condominiumId).length,
  0,
  "the old camelCase/legacy-ID picker could not display a raw PostgREST document",
);

const [mapped] = mapRegisterDocumentRows([rawRow]);
assert.deepEqual(mapped, {
  id: 412,
  name: "Verbale assemblea",
  condominiumId,
  category: "Assemblee",
  date: "2026-11-26T08:00:00.000Z",
  size: "2048 B",
  notes: "Documento verificato",
});
assert.equal(
  [mapped].filter((document) => document.condominiumId === condominiumId).length,
  1,
  "the mapped row must be visible in the selected UUID condominium",
);
assert.equal(mapped.id, rawRow.legacy_id, "work-document links must use documents.legacy_id, not the UUID primary key");

assert.deepEqual(
  mapRegisterDocumentRows([
    { ...rawRow, legacy_id: null },
    { ...rawRow, legacy_id: "9007199254740993" },
    { ...rawRow, legacy_id: 413, condominium_id: null },
  ]),
  [],
  "rows without a linkable legacy ID or condominium scope must be excluded",
);
assert.throws(
  () => mapRegisterDocumentRows([rawRow, { ...rawRow, id: "another-uuid" }]),
  /duplicate workspace legacy ID/,
);
assert.throws(() => mapRegisterDocumentRows(null), /must be an array/);
assert.throws(() => mapRegisterDocumentRows([null]), /malformed PostgREST row/);

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.ok(
  source.includes('import { mapRegisterDocumentRows } from "./lib/registerDocumentRows.mjs";'),
  "RegisterPage must import the PostgREST row mapper",
);
assert.ok(
  source.includes("setDocuments(mapRegisterDocumentRows(e.data??[]))"),
  "raw PostgREST rows must be mapped before entering picker state",
);
assert.ok(
  source.includes("documents.filter(d=>d.condominiumId===dbId)"),
  "the picker must compare the document condominium UUID with the resolved database UUID",
);
assert.ok(
  source.includes("document_id:id"),
  "the relation write must use the mapped legacy document ID",
);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(
  packageJson.scripts.test.includes("test-register-document-row-mapping.mjs"),
  "the runtime regression must be part of npm test",
);

console.log("PASS: Register document picker maps raw PostgREST UUID/snake_case rows to the bigint legacy-ID model.");
