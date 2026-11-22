import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helper = await readFile("src/lib/accountingConsumptionReadingPagination.ts", "utf8");
const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(helper, /from\("condominium_consumption_readings"\)/);
assert.match(helper, /\.eq\("workspace_id", workspaceId\)/);
assert.match(helper, /\.range\(offset, offset \+ 999\)/);
assert.match(helper, /\.order\("period_end", \{ ascending: false \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/);
assert.match(helper, /if \(error\) throw error/);
assert.match(source, /loadWorkspaceConsumptionReadings/);
assert.match(packageJson.scripts.test, /test-accounting-consumption-reading-pagination\.mjs/);
console.log("Accounting consumption reading pagination guard passed.");
