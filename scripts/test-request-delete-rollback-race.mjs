import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = source.indexOf("const deleteCondominiumRequest = async (id: number) => {");
const end = source.indexOf("const updateCondominiumRequestStatus =", start);
assert.ok(start >= 0 && end > start, "delete request handler should exist");
const handler = source.slice(start, end);
assert.match(handler, /const previousRequest = condominiumRequests\.find\(\(request\) => request\.id === id\)/, "capture only the deleted row for rollback");
assert.match(handler, /setCondominiumRequests\(\(current\) => current\.filter\(\(request\) => request\.id !== id\)\)/, "optimistic delete must be scoped to current state");
assert.match(handler, /current\.some\(\(request\) => request\.id === id\)/, "rollback must check whether the row already exists");
assert.match(handler, /current\.map\(\(request\) => request\.id === id \? previousRequest : request\)/, "rollback must restore only the deleted row when present");
assert.match(handler, /\[\.\.\.current, previousRequest\]/, "rollback must restore only the deleted row without replacing unrelated state");
assert.doesNotMatch(handler, /setCondominiumRequests\(previousRequests\)/, "rollback must not replace the entire list with a stale snapshot");
console.log("Request deletion rollback race regression checks passed.");
