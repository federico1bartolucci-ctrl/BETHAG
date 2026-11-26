import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function saveCondominiumWorkProgress(");
const end = source.indexOf("export async function ", start + 30);
assert.ok(start >= 0 && end > start, "SAL save helper boundaries exist");
const helper = source.slice(start, end);
assert.match(helper, /data: existingProgress, error: existingProgressError/);
assert.match(helper, /if \(existingProgressError\) throw existingProgressError;/);
console.log("SAL existing-progress lookup error regression passed.");
