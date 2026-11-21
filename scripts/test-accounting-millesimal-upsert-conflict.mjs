import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../src/AccountingPage.tsx",import.meta.url),"utf8");
assert.ok(source.includes('upsert(payload,{onConflict:"workspace_id,table_id,unit_id"}'),"bulk millesimal upsert conflict target must match unique index");
assert.ok(!source.includes('onConflict:"table_id,unit_id"'),"old invalid conflict target must not remain");
console.log("Accounting millesimal upsert conflict-target regression passed.");
