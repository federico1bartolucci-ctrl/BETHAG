import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = source.indexOf("const deleteCondominiumRequest = async (id: number) => {");
const end = source.indexOf("const updateCondominiumRequestStatus =", start);
assert.ok(start >= 0 && end > start, "request delete handler boundaries exist");
const handler = source.slice(start, end);

assert.match(handler, /if \(!supabaseConfigured \|\| !supabase\)\s*\{\s*setCondominiumRequests\(\(current\) => current\.filter\(\(request\) => request\.id !== id\)\);\s*return;\s*\}/,
  "local-only mode may remove the local request without backend persistence");
assert.match(handler, /if \(!profile\.workspaceId\)[\s\S]*?return;/,
  "a missing workspace must fail closed in Supabase mode");
const deleteCall = handler.indexOf(".from(\"condominium_requests\")");
const affectedRows = handler.indexOf('.select("id")', deleteCall);
const backendError = handler.indexOf("if (error) throw error;", deleteCall);
const zeroRows = handler.indexOf('if (!data?.length) throw new Error("Richiesta non trovata o già eliminata.");', deleteCall);
const localRemoval = handler.indexOf("setCondominiumRequests((current) => current.filter((request) => request.id !== id))", affectedRows);
const catchStart = handler.indexOf("} catch (error)", deleteCall);
assert.ok(deleteCall >= 0 && affectedRows > deleteCall && backendError > affectedRows && zeroRows > backendError,
  "backend delete must return the affected row and reject zero-row success");
assert.ok(localRemoval > zeroRows && localRemoval < catchStart,
  "Supabase-backed local removal must occur only after confirmed backend deletion");
assert.match(handler, /window\.dispatchEvent\(new Event\("bethag-backend-refresh"\)\)/,
  "failed or ambiguous deletion must reconcile from authoritative backend state");
assert.doesNotMatch(handler, /previousRequests|setCondominiumRequests\(previousRequests\)/,
  "failed deletion must not restore a stale full-list snapshot");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-request-delete-authoritative-state.mjs"),
  "request deletion regression must be wired into npm test");
console.log("Request deletion authoritative-state regression checks passed.");
