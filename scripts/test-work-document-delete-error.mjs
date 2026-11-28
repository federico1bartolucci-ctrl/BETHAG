import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapWorkDocumentLinkIds, planWorkDocumentLinkChanges, reconcileWorkDocumentLinks } from "../src/lib/workDocumentLinks.mjs";

assert.deepEqual(mapWorkDocumentLinkIds([]), [], "a legitimate empty SELECT remains valid");
assert.deepEqual(
  mapWorkDocumentLinkIds([{ document_id: 1 }, { document_id: "2" }, { document_id: 2 }]),
  [1, 2],
  "persisted link IDs must be normalized and deduplicated",
);
for (const malformed of [null, undefined, {}, "not-an-array"]) {
  assert.throws(
    () => mapWorkDocumentLinkIds(malformed),
    /Risposta dei collegamenti documentali non valida/,
    "a malformed successful SELECT must not be interpreted as an empty link set",
  );
}

// Reproduce the former false-success path: null was converted to [] and an
// empty desired selection therefore closed the modal without reconciling rows.
{
  const response = { data: null, error: null };
  const legacyCurrentIds = (response.data ?? []).map((row) => row.document_id);
  assert.deepEqual(legacyCurrentIds, []);
  assert.deepEqual(
    planWorkDocumentLinkChanges(legacyCurrentIds, []),
    { toInsert: [], toDelete: [] },
    "the old null fallback falsely treated an unreadable link set as already empty",
  );

  const events = [];
  await assert.rejects(
    reconcileWorkDocumentLinks({
      loadCurrentIds: async () => {
        events.push("load");
        if (response.error) throw response.error;
        return mapWorkDocumentLinkIds(response.data);
      },
      desiredIds: [],
      insertLinks: async () => { events.push("insert"); },
      deleteLinks: async () => { events.push("delete"); },
    }),
    /Risposta dei collegamenti documentali non valida/,
  );
  assert.deepEqual(events, ["load"], "malformed reads must stop before insert/delete");
}

assert.deepEqual(
  planWorkDocumentLinkChanges([1, 2, 2], [2, 3, 3]),
  { toInsert: [3], toDelete: [1] },
  "link replacement must be a deduplicated difference, not delete-all/reinsert-all",
);
assert.throws(
  () => planWorkDocumentLinkChanges([1, 0], [2]),
  /invalid document ID/,
  "invalid persisted IDs must fail before any write",
);
assert.throws(
  () => planWorkDocumentLinkChanges([1], [2, Number.NaN]),
  /invalid document ID/,
  "invalid desired IDs must fail before any write",
);

// If reading the current set fails, no write operation may begin.
{
  const events = [];
  const readError = new Error("current links unavailable");
  await assert.rejects(
    reconcileWorkDocumentLinks({
      loadCurrentIds: async () => { events.push("load"); throw readError; },
      desiredIds: [2, 3],
      insertLinks: async () => { events.push("insert"); },
      deleteLinks: async () => { events.push("delete"); },
    }),
    readError,
  );
  assert.deepEqual(events, ["load"], "a failed read must stop before insert or delete");
}

// If inserting a new link fails, no existing link is deleted.
{
  const existing = new Set([1, 2]);
  const events = [];
  const insertError = new Error("insert rejected");
  await assert.rejects(
    reconcileWorkDocumentLinks({
      loadCurrentIds: async () => { events.push("load"); return [...existing]; },
      desiredIds: [2, 3],
      insertLinks: async () => { events.push("insert"); throw insertError; },
      deleteLinks: async () => { events.push("delete"); },
    }),
    insertError,
  );
  assert.deepEqual(events, ["load", "insert"]);
  assert.deepEqual([...existing].sort(), [1, 2], "an insert failure must preserve every existing link");
}

// If cleanup fails after insertion, old links remain and retry converges without duplicate inserts.
{
  const stored = new Set([1, 2]);
  const events = [];
  const deleteError = new Error("cleanup rejected");
  await assert.rejects(
    reconcileWorkDocumentLinks({
      loadCurrentIds: async () => [...stored],
      desiredIds: [2, 3],
      insertLinks: async ids => { events.push("insert:" + ids.join(",")); ids.forEach(id => stored.add(id)); },
      deleteLinks: async ids => { events.push("delete:" + ids.join(",")); throw deleteError; },
    }),
    deleteError,
  );
  assert.deepEqual([...stored].sort(), [1, 2, 3], "cleanup failure may leave extra links but must not lose existing ones");
  assert.deepEqual(events, ["insert:3", "delete:1"]);

  const retry = await reconcileWorkDocumentLinks({
    loadCurrentIds: async () => [...stored],
    desiredIds: [2, 3],
    insertLinks: async ids => { events.push("retry-insert:" + ids.join(",")); ids.forEach(id => stored.add(id)); },
    deleteLinks: async ids => { events.push("retry-delete:" + ids.join(",")); ids.forEach(id => stored.delete(id)); },
  });
  assert.deepEqual(retry, { inserted: [], deleted: [1] }, "retry must re-read the partially applied state");
  assert.deepEqual([...stored].sort(), [2, 3], "retry must converge to the requested link set");
  assert.ok(!events.some(event => event === "retry-insert:3"), "retry must not insert a duplicate link");
}

// Successful reconciliation adds first, then removes only obsolete links.
{
  const stored = new Set([1, 2]);
  const events = [];
  const result = await reconcileWorkDocumentLinks({
    loadCurrentIds: async () => [...stored],
    desiredIds: [2, 3],
    insertLinks: async ids => { events.push("insert"); ids.forEach(id => stored.add(id)); },
    deleteLinks: async ids => { events.push("delete"); ids.forEach(id => stored.delete(id)); },
  });
  assert.deepEqual(result, { inserted: [3], deleted: [1] });
  assert.deepEqual(events, ["insert", "delete"]);
  assert.deepEqual([...stored].sort(), [2, 3]);
}

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const openStart = source.indexOf("async function openWorkDocuments(");
const saveStart = source.indexOf("async function saveWorkDocuments()", openStart);
assert.ok(openStart >= 0 && saveStart > openStart, "openWorkDocuments must exist before saveWorkDocuments");
const openHandler = source.slice(openStart, saveStart);
assert.match(openHandler, /mapWorkDocumentLinkIds\(data\)/, "opening the modal must validate the successful SELECT response");
assert.ok(openHandler.indexOf("mapWorkDocumentLinkIds(data)") < openHandler.indexOf("setShowDocuments(true)"), "the modal must not open before linked IDs are validated");
assert.doesNotMatch(openHandler, /data\?\?\[\]/, "opening the modal must not coerce null data to an empty link set");

const start = source.indexOf("async function saveWorkDocuments()");
const end = source.indexOf("async function registerProgressPayment", start);
assert.ok(start >= 0 && end > start, "saveWorkDocuments must exist");
const fn = source.slice(start, end);
assert.match(fn, /reconcileWorkDocumentLinks\(/, "the UI must use the tested reconciliation helper");
assert.match(fn, /loadCurrentIds:async\(\)/, "current link IDs must be re-read before every save/retry");
assert.match(fn, /return mapWorkDocumentLinkIds\(data\)/, "save-time reads must reject malformed successful responses");
assert.doesNotMatch(fn, /data\?\?\[\]/, "save-time reads must not coerce null data to an empty link set");
assert.match(fn, /insertLinks:async\(ids\)/, "new links must be inserted before obsolete links are removed");
assert.match(fn, /deleteLinks:async\(ids\)/, "only obsolete link IDs may be deleted");
assert.match(fn, /\.eq\("workspace_id",workspaceId\)[\s\S]*\.eq\("condominium_id",dbId\)[\s\S]*\.eq\("work_id",documentWork\.id\)/, "all link reads and writes must remain workspace/condominium/work scoped");
assert.match(fn, /\.in\("document_id",ids\)/, "delete must target only the obsolete document IDs");
assert.ok(!fn.includes('.delete().eq("work_id",documentWork.id).eq("workspace_id",workspaceId)'), "full destructive delete/reinsert must be removed");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-work-document-delete-error.mjs"), "the regression must remain in npm test");

console.log("PASS work-document link reconciliation rejects malformed successful reads and preserves existing links on partial failures");
