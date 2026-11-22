import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.match(source, /async function loadCondominiumTransferRows\(/, "transfer history must use a shared loader");
assert.match(source, /\.order\("transfer_date", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: true \}\)\s*\.range\(offset, offset \+ 999\)/, "transfer pagination must be stable and range-based");
assert.match(source, /offset \+= 1000/, "loader must advance page offsets");
assert.match(source, /if \(batch\.length < 1000\) break;/, "loader must stop at final page");
assert.match(source, /loadCondominiumTransferRows\(workspaceId, condominiumId\)/, "component loads must use the shared paginated loader");
assert.match(source, /setRows\(data\);\s*setError\(""\);/, "successful transfer-history load must clear stale errors");
assert.doesNotMatch(source, /\.from\("condominium_member_transfers"\)\s*\.select\([^)]*\)\s*\.eq\("workspace_id", workspaceId\)\s*\.eq\("condominium_id", condominiumId\)\s*\.order\("transfer_date", \{ ascending: false \}\)\s*(?:;|\.then)/, "direct unpaginated transfer-history queries must be removed");
console.log("PASS: condominium transfer history queries use stable pagination.");
