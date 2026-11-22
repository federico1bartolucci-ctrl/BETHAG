import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.match(source, /preview\.transfer_scope === transferScope/);
assert.match(source, /transfer_scope: transferScope,/);
console.log("Transfer preview scope regression guard: PASS");
