import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const helper = await readFile(new URL("../src/lib/registerProgressPaymentLink.js", import.meta.url), "utf8");
assert.match(source, /linkRegisterProgressPaymentOrCompensate\(/, "partial SAL payment handler must use the compensated helper");
assert.match(helper, /if\s*\(updateError\s*\|\|\s*!updatedProgress\?\.id\)/, "zero-row SAL updates must be treated as failures");
assert.match(helper, /\.from\("condominium_ledger_entries"\)\s*\.delete\(\)/, "failed SAL linking must delete the newly inserted ledger row");
assert.match(helper, /if\s*\(rollbackError\)/, "failed compensation must be surfaced");
assert.match(helper, /Verifica la scrittura/, "rollback failure must identify the ledger entry for manual reconciliation");
assert.match(helper, /scrittura contabile annullata/, "successful compensation must be reported");
assert.match(helper, /updateError\.message/, "update errors must be exposed");
assert.match(helper, /SAL non trovato/, "zero-row update must produce an explicit failure");
console.log("SAL ledger compensation regression checks passed.");
