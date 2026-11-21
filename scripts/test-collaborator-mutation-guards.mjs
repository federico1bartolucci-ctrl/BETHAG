import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireCollaboratorMutationResult } from "../src/lib/collaboratorMutationGuard.mjs";

const source = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/collaboratorMutationGuard.mjs", import.meta.url), "utf8");
const pageStart = source.indexOf("function CollaboratorsPage(");
const saveStart = source.indexOf("const save = async (e: React.FormEvent)", pageStart);
const removeStart = source.indexOf("const remove = async (id: number)", saveStart);
const toggleStart = source.indexOf("const toggleStatus = async (id: number)", removeStart);
const permissionStart = source.indexOf("const togglePermission", toggleStart);
assert.ok(pageStart >= 0 && saveStart > pageStart && removeStart > saveStart && toggleStart > removeStart && permissionStart > toggleStart);
const save = source.slice(saveStart, removeStart);
const remove = source.slice(removeStart, toggleStart);
const toggle = source.slice(toggleStart, permissionStart);

assert.match(helperSource, /\.select\("user_id"\)\.maybeSingle\(\)/);
assert.match(save, /requireCollaboratorMutationResult/);
assert.match(save, /\.update\([\s\S]*?\)\.eq\("workspace_id", workspaceId\)\.eq\("user_id", current\.userId\)\.eq\("role", "collaborator"\)/);
assert.match(save, /"aggiornato"/);
assert.ok(save.indexOf("requireCollaboratorMutationResult") < save.indexOf("setCollaborators((items) => items.map("), "Local collaborator state must update only after the database mutation returns a row");
assert.match(remove, /requireCollaboratorMutationResult/);
assert.match(remove, /\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("user_id", target\.userId\)[\s\S]*\.eq\("role", "collaborator"\)/);
assert.match(remove, /"rimosso"/);
assert.ok(remove.indexOf("requireCollaboratorMutationResult") < remove.indexOf("setCollaborators((items) => items.filter("), "Local removal must follow a verified database deletion");
assert.match(toggle, /requireCollaboratorMutationResult/);
assert.match(toggle, /\.update\(\{ active: nextActive \}\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("user_id", target\.userId\)[\s\S]*\.eq\("role", "collaborator"\)/);
assert.match(toggle, /"aggiornato"/);
assert.ok(toggle.indexOf("requireCollaboratorMutationResult") < toggle.indexOf("setCollaborators((items) => items.map("), "Local status must update only after a verified database mutation");

const fakeQuery = (result) => ({
  select(columns) {
    assert.equal(columns, "user_id");
    return { maybeSingle: async () => result };
  },
});
const saved = await requireCollaboratorMutationResult(fakeQuery({ data: { user_id: "user-1" }, error: null }), "aggiornato");
assert.deepEqual(saved, { user_id: "user-1" });
await assert.rejects(() => requireCollaboratorMutationResult(fakeQuery({ data: null, error: null }), "aggiornato"), /Collaboratore non aggiornato/);
const updateError = new Error("permission denied");
await assert.rejects(() => requireCollaboratorMutationResult(fakeQuery({ data: null, error: updateError }), "aggiornato"), (error) => error === updateError);
const removed = await requireCollaboratorMutationResult(fakeQuery({ data: { user_id: "user-2" }, error: null }), "rimosso");
assert.deepEqual(removed, { user_id: "user-2" });
await assert.rejects(() => requireCollaboratorMutationResult(fakeQuery({ data: null, error: null }), "rimosso"), /Collaboratore non rimosso/);
const deleteError = new Error("constraint violation");
await assert.rejects(() => requireCollaboratorMutationResult(fakeQuery({ data: null, error: deleteError }), "rimosso"), (error) => error === deleteError);

console.log("Collaborator mutation guard regression checks passed.");
