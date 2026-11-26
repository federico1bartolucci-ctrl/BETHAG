import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");

const start = app.indexOf("const updateCondominiumRequestStatus = async (id: number, status: RequestStatus) => {");
const end = app.indexOf("const prepareCondominiumEmail =", start);
assert.ok(start >= 0 && end > start, "request status handler boundaries exist");
const handler = app.slice(start, end);
assert.match(handler, /request\.id === id && request\.status === status/,
  "rollback must only target the still-current optimistic status");
assert.match(handler, /\{ \.\.\.request, status: currentRequest\.status \}/,
  "rollback must preserve other current request fields");
assert.doesNotMatch(handler, /request\.id === id \? currentRequest : request/,
  "rollback must not replace a newer request snapshot");
assert.match(handler, /window\.dispatchEvent\(new Event\("bethag-backend-refresh"\)\)/,
  "failed or ambiguous persistence must reconcile from authoritative backend state");

const backendStart = backend.indexOf("export async function updateCondominiumRequestStatus(");
const backendEnd = backend.indexOf("export async function confirmCondominiumMemberTransfer(", backendStart);
assert.ok(backendStart >= 0 && backendEnd > backendStart, "request status backend helper boundaries exist");
const helper = backend.slice(backendStart, backendEnd);
assert.match(helper, /\.from\("condominium_requests"\)[\s\S]*\.update\([\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("legacy_id", request\.id\)[\s\S]*\.select\("id"\)/,
  "status update must retain workspace scope and return the affected row ID");
assert.match(helper, /if \(error\) throw error;/);
assert.match(helper, /if \(!data\?\.length\) throw new Error\("Richiesta non trovata o non più aggiornabile\."\);/,
  "zero-row updates must fail closed");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-request-status-rollback-race.mjs"),
  "request status concurrency regression must be wired into npm test");

console.log("Request status rollback/concurrency and zero-row persistence regression checks passed.");
