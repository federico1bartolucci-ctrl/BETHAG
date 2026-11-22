import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
assert.match(source, /async function resolveCondominium\(\)[\s\S]*?return data\.id;/, "Condominium resolver must return the resolved DB ID.");
assert.match(source, /const resolvedDbCondominiumId = await resolveCondominium\(\);/, "Load must use the resolver result directly.");
assert.match(source, /row\.condominium_id === resolvedDbCondominiumId/, "Accounting settings must be matched against the resolved ID, not stale React state.");
assert.match(source, /if \(!data\?\.id\)\s*\{[\s\S]*?throw new Error\("Condominio selezionato non trovato nel database\."\);/, "Missing condominium mapping must fail closed.");
console.log("Accounting condominium-context regression guard passed.");
