import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireCondominiumUnitDeleteResult } from "../src/lib/condominiumUnitDeleteResult.mjs";

const backend = readFileSync(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/condominiumUnitDeleteResult.mjs", import.meta.url), "utf8");
const start = backend.indexOf("export async function deleteCondominiumUnit(");
const end = backend.indexOf("export async function deleteCondominiumMember(", start);
assert.ok(start >= 0 && end > start);
const deletion = backend.slice(start, end);

assert.match(deletion, /await requireCondominiumUnitDeleteResult\(/);
assert.match(deletion, /\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", condominium\.id\)[\s\S]*\.eq\("id", unitId\)/);
assert.match(helperSource, /\.select\("id"\)\.maybeSingle\(\)/);

const fakeQuery = (result) => ({
  select(columns) {
    assert.equal(columns, "id");
    return { maybeSingle: async () => result };
  },
});
const deleted = await requireCondominiumUnitDeleteResult(fakeQuery({ data: { id: "unit-1" }, error: null }));
assert.deepEqual(deleted, { id: "unit-1" });
await assert.rejects(
  () => requireCondominiumUnitDeleteResult(fakeQuery({ data: null, error: null })),
  /Unità non eliminata/
);
const databaseError = new Error("foreign key restriction");
await assert.rejects(
  () => requireCondominiumUnitDeleteResult(fakeQuery({ data: null, error: databaseError })),
  (error) => error === databaseError
);
console.log("Condominium unit zero-row delete regression checks passed.");
