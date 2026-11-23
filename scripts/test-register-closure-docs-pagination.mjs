import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function closeWork(");
const end = source.indexOf("async function saveWork(e)", start);
assert.ok(start >= 0 && end > start, "closeWork boundary must identify the actual function");
const closeWork = source.slice(start, end);
assert.ok(
  closeWork.includes('loadWorkspacePaginatedRows(supabase,"condominium_work_documents",workspaceId,{filters:{work_id:w.id},pageSize:1000,select:"id,created_at"})'),
  "work closure must filter links by work_id and select the pagination cursor",
);
assert.ok(closeWork.includes("if(de){setError(de.message);return;}"), "document check must fail closed on query errors");
assert.ok(closeWork.includes("if(!docs?.length&&!window.confirm"), "closure should retain documentless confirmation");

const helper = await readFile(new URL("../src/lib/workspacePagination.mjs", import.meta.url), "utf8");
assert.ok(helper.includes("validateFilters(filters, workspaceColumn)"), "pagination helper must validate filters");
assert.ok(helper.includes("for (const [column, value] of filterEntries) query = query.eq(column, value)"), "pagination helper must apply filters to every page");
console.log("PASS: Register closure document pagination guard.");
