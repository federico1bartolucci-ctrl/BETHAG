import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const queryStart = source.indexOf("const { data: unitMembers, error: unitMembersError }");
assert.notEqual(queryStart, -1, "member lookup for unified installments must exist");
const queryEnd = source.indexOf("if (unitMembersError) throw unitMembersError;", queryStart);
assert.notEqual(queryEnd, -1, "member lookup must propagate errors");
const query = source.slice(queryStart, queryEnd);
assert.match(query, /\.eq\("workspace_id", workspaceId\)/, "unit-member lookup must be workspace-scoped");
assert.match(query, /\.eq\("condominium_id", dbCondominiumId\)/, "unit-member lookup must remain condominium-scoped");
assert.match(query, /\.eq\("active", true\)/, "unit-member lookup must restrict to active members");
assert.match(query, /\.in\("unit_id", unitIds\)/, "unit-member lookup must be limited to selected units");
console.log("Accounting installment member lookup workspace-scope guard: PASS");
