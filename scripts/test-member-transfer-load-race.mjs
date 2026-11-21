import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.ok(source.includes("useRef, useState"), "useRef is imported for request generation");
assert.ok(source.includes("const rowsLoadRequestRef = useRef(0);"), "request generation is tracked");
assert.ok(source.includes("const requestId = ++rowsLoadRequestRef.current;"), "each transfer list load receives an ID");
assert.ok(source.includes("if (requestId !== rowsLoadRequestRef.current) return;"), "stale transfer list response is discarded");
assert.ok(source.includes("return () => { rowsLoadRequestRef.current += 1; };"), "effect cleanup invalidates in-flight transfer list loads");
console.log("Member transfer load race regression checks passed");
