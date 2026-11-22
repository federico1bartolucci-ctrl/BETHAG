import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.match(source, /async function fetchTransferHistory\(workspaceId: string, condominiumId: string\)/, "History must use a shared loader.");
assert.match(source, /const pageSize = 1000/, "Loader must use bounded page size.");
assert.match(source, /\.range\(offset, offset \+ pageSize - 1\)/, "Loader must request sequential ranges.");
assert.match(source, /if \(page\.length < pageSize\) return allRows/, "Loader must stop only after a short page.");
assert.match(source, /\.eq\("workspace_id", workspaceId\)/, "Pages must be workspace scoped.");
assert.match(source, /\.eq\("condominium_id", condominiumId\)/, "Pages must be condominium scoped.");
assert.equal((source.match(/fetchTransferHistory\(workspaceId, condominiumId\)/g) || []).length, 2, "Both initial and explicit reload paths must use the shared paginated loader.");
console.log("Transfer history pagination guard: PASS");
