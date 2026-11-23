import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.ok(source.includes('import { loadWorkspacePaginatedRows } from "./lib/workspacePagination.mjs";'), "RegisterPage must import shared paginated loader");
assert.ok(source.includes('loadWorkspacePaginatedRows(supabase,"documents",workspaceId,{orderBy:"created_at",pageSize:1000})'), "document picker must load documents through shared pagination");
assert.ok(source.includes('setDocuments(e.data??[])'), "paginated result must feed document picker state");
console.log("PASS: Register document picker hydration uses shared workspace pagination.");
