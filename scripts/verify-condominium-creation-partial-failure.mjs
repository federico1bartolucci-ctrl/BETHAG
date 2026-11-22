import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/main.tsx", "utf8");
const start = source.indexOf("const saveCondominium = async");
const end = source.indexOf("const saveDeadline =", start);
assert.notEqual(start, -1, "Condominium save handler must exist");
assert.notEqual(end, -1, "Condominium save handler boundary must be detectable");
const handler = source.slice(start, end);

assert.match(handler, /let condominiumServerSaveCompleted = false/, "Track whether the condominium parent record was persisted");
assert.match(handler, /await saveCondominiumBackend\(workspaceId, savedItem\);\s*condominiumServerSaveCompleted = true/, "Mark the parent record persisted only after RPC success");
assert.match(handler, /generatedUnitServerSavesCompleted \+= 1/, "Track each successfully persisted generated unit");
assert.match(handler, /Il condominio è stato salvato sul server, ma la configurazione delle unità potrebbe essere incompleta/, "Failure message must distinguish partial persistence from total failure");
assert.match(handler, /Unità anagrafiche salvate prima dell'errore:/, "Partial failure message must report completed unit saves");
assert.match(handler, /Anche l'elaborazione dei proprietari confermati potrebbe essere incompleta/, "AI-confirmed owner processing must be disclosed as potentially incomplete");
assert.match(handler, /Il condominio non è stato salvato sul server/, "Pre-parent-save failure must still report no parent save");

console.log("Condominium creation partial-failure reporting guard: PASS");
