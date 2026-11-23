import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const load = source.slice(source.indexOf("async function load()"), source.indexOf("useEffect(()=>{load();}"));
assert.ok(source.includes('import { loadWorkspacePaginatedRows } from "./lib/workspacePagination.mjs";'), "Register must import shared workspace pagination");
assert.ok(load.includes('loadWorkspacePaginatedRows(supabase,"condominium_works",workspaceId,{orderBy:"start_date",pageSize:1000})'), "works must hydrate with shared pagination");
assert.ok(load.includes("if(d.error)throw d.error"), "works page errors must be surfaced");
assert.ok(load.includes("setWorks(d.data??[])"), "complete work rows must feed state");
console.log("PASS: Register works hydration pagination guard.");
