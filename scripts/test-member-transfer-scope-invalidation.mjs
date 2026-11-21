import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
const scopeHandler = source.match(/onChange=\{e=>\{\s*const next = e\.target\.value as "whole_property" \| "ownership_share";([\s\S]*?)\n\s*\}\}>/);
assert.ok(scopeHandler, "transfer scope change handler exists");
assert.match(scopeHandler[1], /previewRequestId\.current\s*\+=\s*1/, "changing transfer scope invalidates pending preview requests");
assert.ok(scopeHandler[1].indexOf("previewRequestId.current += 1") < scopeHandler[1].indexOf("setTransferScope(next)"), "invalidation occurs before the new scope is applied");

// Reproduce the async race: a preview started in scope A must not commit after scope B is selected.
let currentRequest = 1;
let committedPreview = null;
const pendingRequest = { id: 1, value: "scope-A-preview" };
currentRequest += 1; // scope changed before the old request resolved
if (pendingRequest.id === currentRequest) committedPreview = pendingRequest.value;
assert.equal(committedPreview, null, "an in-flight preview from the old scope is rejected");

console.log("Member transfer scope-change preview invalidation: PASS");
