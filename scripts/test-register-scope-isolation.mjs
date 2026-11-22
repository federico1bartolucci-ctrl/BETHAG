import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getScopedRegisterCondominiumId } from "../src/lib/register-scope.mjs";

const previousScope = { workspaceId: "workspace-A", selected: 42, condominiumId: "condo-uuid-A" };
const oldRows = [{ condominium_id: "condo-uuid-A", title: "Previous condominium private row" }];

// Reproduce the pre-fix behavior: selection changes first, while React state
// still contains the previously resolved DB ID and the old workspace rows.
assert.equal(oldRows.filter(row => row.condominium_id === previousScope.condominiumId).length, 1);
const changedSelection = 43;
assert.equal(
  getScopedRegisterCondominiumId(previousScope, "workspace-A", changedSelection),
  null,
  "Old condominium rows must be hidden synchronously before the new resolver completes."
);
const visibleBeforeResolution = oldRows.filter(row =>
  row.condominium_id === getScopedRegisterCondominiumId(previousScope, "workspace-A", changedSelection)
);
assert.deepEqual(visibleBeforeResolution, [], "A selection switch must not show the previous condominium rows.");

assert.equal(getScopedRegisterCondominiumId(previousScope, "workspace-A", 42), "condo-uuid-A");
assert.equal(getScopedRegisterCondominiumId(previousScope, "workspace-B", 42), null, "Workspace switch must invalidate old scope.");
assert.equal(getScopedRegisterCondominiumId({ workspaceId: "workspace-A", selected: "all", condominiumId: null }, "workspace-A", "all"), null);
assert.equal(getScopedRegisterCondominiumId(null, "workspace-A", 42), null);

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(source, /getScopedRegisterCondominiumId\(resolvedScope,workspaceId,selected\)/, "RegisterPage must derive its active DB scope from the current selection.");
assert.match(source, /setResolvedScope\(\{workspaceId,selected,condominiumId:resolvedId\}\)/, "Resolved scope must be tagged with the selection that produced it.");
assert.match(packageJson.scripts.test, /test-register-scope-isolation\.mjs/, "Regression must run in npm test.");
console.log("RegisterPage condominium scope isolation runtime regression: PASS");
