import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const functionsSql = await readFile(new URL("../supabase/migrations/20261017000003_bethag_baseline_functions.sql", import.meta.url), "utf8");
const triggersSql = await readFile(new URL("../supabase/migrations/20261017000004_bethag_baseline_security.sql", import.meta.url), "utf8");

const start = backend.indexOf("export async function saveCondominiumWorkProgress(");
const end = backend.indexOf("export async function ", start + 30);
assert.ok(start >= 0 && end > start, "SAL save helper boundaries exist");
const helper = backend.slice(start, end);
const workUpdateStart = helper.indexOf('from("condominium_works").update({', helper.indexOf("const { error: workUpdateError }"));
assert.ok(workUpdateStart >= 0, "SAL helper must update work status/date");
const workUpdateEnd = helper.indexOf("}).eq(\"workspace_id\", workspaceId).eq(\"id\", workId)", workUpdateStart);
assert.ok(workUpdateEnd > workUpdateStart, "work summary update block must be identifiable");
const workUpdate = helper.slice(workUpdateStart, workUpdateEnd);
assert.doesNotMatch(workUpdate, /progress_percent\s*:/, "SAL helper must not overwrite trigger-owned progress_percent");
assert.doesNotMatch(workUpdate, /actual_amount\s*:/, "SAL helper must not overwrite trigger-owned actual_amount");

assert.match(functionsSql, /CREATE OR REPLACE FUNCTION public\.sync_condominium_work_financial_summary\([\s\S]*?FOR UPDATE[\s\S]*?UPDATE public\.condominium_works SET actual_amount/i);
assert.match(functionsSql, /CREATE OR REPLACE FUNCTION public\.sync_condominium_work_financial_summary_trigger\([\s\S]*?PERFORM public\.sync_condominium_work_financial_summary\(new\.work_id\)/i);
assert.ok(triggersSql.includes('CREATE TRIGGER sync_condominium_work_financial_summary AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION sync_condominium_work_financial_summary_trigger()'), "the progress trigger must recalculate the parent work summary");

console.log("SAL financial summary trigger ownership / stale overwrite regression: PASS");
