import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const helper = await readFile("src/lib/accountingLegalCasesPagination.mjs", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(source, /import \{ loadAccountingLegalCases \} from ["']\.\/lib\/accountingLegalCasesPagination\.mjs["']/);
assert.match(source, /loadAccountingLegalCases\(supabase, workspaceId\)/);
assert.match(helper, /const TABLE = "condominium_legal_cases"/);
assert.match(helper, /\.from\(TABLE\)[\s\S]*?\.range\(0, pageSize - 1\)/);
assert.match(helper, /\.eq\("workspace_id", workspaceId\)/);
assert.match(helper, /\.order\("opened_date", \{ ascending: false, nullsFirst: false \}\)/);
assert.match(helper, /\.order\("id", \{ ascending: true \}\)/);
assert.match(helper, /opened_date\.lt\.[\s\S]*?id\.gt/);
assert.match(helper, /opened_date.is.null/, "date cursor must include NULL rows after dated cases");
assert.match(helper, /\.is\("opened_date", null\)\.gt\("id", cursor\.id\)/);
assert.match(helper, /if \(error\) return \{ data: null, error \}/);
assert.match(packageJson.scripts.test, /test-accounting-legal-cases-keyset-pagination-runtime\.mjs/);

console.log("Accounting legal case keyset pagination wiring regression checks passed.");
