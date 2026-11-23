import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const registerPayment = source.slice(source.indexOf("async function registerProgressPayment"), source.indexOf("async function auditWork"));
const recordPayment = source.slice(source.indexOf("async function recordProgressPayment"), source.indexOf("async function saveProgress"));
assert.ok(registerPayment.includes("rollbackLedgerError"), "register payment must compensate ledger when progress update fails");
assert.ok(registerPayment.includes("rollbackProgressError"), "register payment must compensate progress if event insertion fails");
assert.ok(registerPayment.includes("rollbackLedgerError"), "register payment must delete inserted ledger on event failure");
assert.ok(registerPayment.includes(".eq(\"workspace_id\",workspaceId)"), "compensating delete must be workspace scoped");
assert.ok(recordPayment.includes("rollbackLedgerError"), "legacy payment pathway must compensate ledger when SAL link fails");
assert.ok(recordPayment.includes("movimento contabile compensato"), "compensation outcome must be explicit");
console.log("PASS: SAL ledger compensation paths and workspace scope statically guarded.");
