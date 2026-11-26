import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function cancelCondominiumCreationIntake(");
const end = source.indexOf("export async function confirmCondominiumInvoice(", start);
assert.ok(start >= 0 && end > start, "intake cancellation helper boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.from\("condominium_creation_intakes"\)[\s\S]*\.update\([\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("id", intakeId\)[\s\S]*\.select\("id"\)/,
  "cancellation must remain workspace-scoped and return the affected intake ID");
assert.match(helper, /if \(error\) throw error;/,
  "database errors must propagate");
assert.match(helper, /if \(!data\?\.length\) throw new Error\("Pratica di creazione condominio non trovata o già annullata\."\);/,
  "zero-row cancellation must fail closed");
console.log("Condominium creation intake cancel zero-row regression passed.");
