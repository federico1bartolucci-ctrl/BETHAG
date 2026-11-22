import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const helperStart = source.indexOf("const loadWorkspaceRows = async");
const helperEnd = source.indexOf("const loadWorkspaceCondominiumMembers", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "workspace pagination helper must exist");
const helper = source.slice(helperStart, helperEnd);
assert.match(helper, /\.order\(orderBy, \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)[\s\S]*?\.range\(offset, offset \+ 999\)/,
  "workspace pagination must use a stable secondary ID sort before range pagination");
console.log("Workspace pagination deterministic-order guard: PASS");
