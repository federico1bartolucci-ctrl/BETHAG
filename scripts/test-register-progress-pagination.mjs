import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const load = source.slice(source.indexOf("async function load()"), source.indexOf("useEffect(()=>{load();}"));
assert.ok(source.includes('import { loadWorkspacePaginatedRows } from "./lib/workspacePagination.mjs";'), "Register must import shared workspace pagination");
assert.ok(load.includes('loadWorkspacePaginatedRows(supabase,"condominium_work_progress",workspaceId,{orderBy:"progress_date",pageSize:1000})'), "work progress must be hydrated using shared pagination");
assert.ok(load.includes("if(pq.error)throw pq.error"), "progress page errors must be surfaced");
assert.ok(load.includes("setProgress(pq.data??[])"), "loaded complete progress rows must feed state");
console.log("PASS: Register work progress hydration pagination guard.");
