import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountingSource = await readFile("src/AccountingPage.tsx", "utf8");
const helperSource = await readFile("src/lib/accountingCondominiumMembers.mjs", "utf8");

assert.ok(
  accountingSource.includes("loadAccountingCondominiumMembers(supabase, workspaceId)"),
  "Accounting members hydration must pass the active workspace to the scoped loader",
);
assert.ok(
  helperSource.includes("condominiums!inner(workspace_id)") &&
    helperSource.includes('.eq("condominiums.workspace_id", workspaceId)'),
  "Accounting members loader must enforce workspace scope through the condominium relation",
);
console.log("PASS: Accounting members workspace scope guard.");
