import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../src/AccountingPage.tsx",import.meta.url),"utf8");
const match=source.match(/condominium_millesimal_values\\"\\)\\.upsert\\(payload,\\s*\\{onConflict:\\"([^\\\"]+)\\\"\\}/);
assert.ok(match,"bulk millesimal upsert conflict target must exist");
assert.equal(match[1],"workspace_id,table_id,unit_id","upsert conflict target must match the unique index columns");
console.log("Accounting millesimal upsert conflict-target regression passed.");
