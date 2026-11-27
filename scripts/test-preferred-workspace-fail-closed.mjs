import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveActiveWorkspaceId } from "../src/lib/preferredWorkspaceResolution.mjs";

const requestedWorkspace = "workspace-A";
const otherActiveWorkspace = { workspace_id: "workspace-B" };

const previousBehavior = null?.workspace_id ?? otherActiveWorkspace.workspace_id ?? null;
assert.equal(previousBehavior, "workspace-B");
assert.equal(resolveActiveWorkspaceId(requestedWorkspace, null, otherActiveWorkspace), null);
assert.equal(resolveActiveWorkspaceId(requestedWorkspace, { workspace_id: requestedWorkspace }, otherActiveWorkspace), requestedWorkspace);
assert.equal(resolveActiveWorkspaceId(requestedWorkspace, { workspace_id: "workspace-B" }, otherActiveWorkspace), null);
assert.equal(resolveActiveWorkspaceId("   ", null, otherActiveWorkspace), null);
assert.equal(resolveActiveWorkspaceId(42, null, otherActiveWorkspace), null);
assert.equal(resolveActiveWorkspaceId(undefined, null, otherActiveWorkspace), "workspace-B");
assert.equal(resolveActiveWorkspaceId(null, null, otherActiveWorkspace), "workspace-B");

const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
assert.match(backend, /import\s*\{\s*resolveActiveWorkspaceId\s*\}\s*from\s*["']\.\/preferredWorkspaceResolution\.mjs["']/);
const resolverStart = backend.indexOf("export async function getActiveWorkspaceId(");
const resolverEnd = backend.indexOf("export async function getWorkspacePlan(", resolverStart);
assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
const resolverSource = backend.slice(resolverStart, resolverEnd);
assert.match(resolverSource, /preferredWorkspaceId !== undefined && preferredWorkspaceId !== null/);
assert.match(resolverSource, /if \(!requestedWorkspaceId\) return null/);
assert.match(resolverSource, /if \(preferredError\) throw preferredError/);
assert.match(resolverSource, /return resolveActiveWorkspaceId\(preferredWorkspaceId, preferred, null\)/);
assert.match(resolverSource, /return resolveActiveWorkspaceId\(undefined, null, data\)/);
const saveStart = backend.indexOf("export async function saveCondominium(");
const saveEnd = backend.indexOf("export async function archiveCondominium(", saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart);
const saveSource = backend.slice(saveStart, saveEnd);
assert.match(saveSource, /getActiveWorkspaceId\(userId, workspaceId\)/);
assert.match(saveSource, /p_workspace_id:\s*activeWorkspaceId/);
console.log("Preferred workspace mismatch fail-closed runtime regression: PASS");
