import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { insertWorkProgressRecord } from "../src/lib/insertWorkProgressRecord.mjs";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveProgress(");
const end = source.indexOf(" async function saveWorkExpense(", start);
assert.ok(start >= 0 && end > start, "active Register saveProgress boundaries exist");
const saveProgress = source.slice(start, end);

assert.ok(saveProgress.includes("insertWorkProgressRecord"), "active SAL form must use the trigger-owned insert helper");
assert.doesNotMatch(saveProgress, /const cumulative\s*=/, "client must not sum cumulative SAL percentages");
assert.doesNotMatch(saveProgress, /progress_percent\s*:/, "client must not overwrite trigger-owned progress_percent");
assert.doesNotMatch(saveProgress, /from\(["']condominium_works["']\)\.update/, "SAL insert must not issue a second parent-work update");

const rows = [
  { progress_no: 1, progress_date: "2026-01-10", percentage: 30, created_at: "2026-01-10T10:00:00.000Z" },
  { progress_no: 2, progress_date: "2026-02-10", percentage: 50, created_at: "2026-02-10T10:00:00.000Z" },
];
const work = { progress_percent: 50 };
const calls = [];
const payload = {
  workspace_id: "workspace-1",
  condominium_id: "condominium-1",
  work_id: "work-1",
  progress_no: 3,
  progress_date: "2026-03-10",
  percentage: 70,
  amount: 100,
  paid_amount: 0,
};

const legacyCumulative = Math.min(100, rows.reduce((sum, row) => sum + row.percentage, 0) + payload.percentage);
assert.equal(legacyCumulative, 100, "reproduction: old client sum would incorrectly mark 30% + 50% + 70% as 100%");

const supabase = {
  from(table) {
    assert.equal(table, "condominium_work_progress", "only the SAL row may be written by this helper");
    return {
      async insert(inserted) {
        calls.push({ table, operation: "insert", payload: inserted });
        rows.push({ ...inserted, created_at: "2026-03-10T10:00:00.000Z" });

        // Simulate the real AFTER INSERT trigger:
        // latest progress_date/progress_no/created_at owns progress_percent.
        const latest = [...rows].sort((a, b) =>
          String(b.progress_date).localeCompare(String(a.progress_date)) ||
          Number(b.progress_no) - Number(a.progress_no) ||
          String(b.created_at).localeCompare(String(a.created_at))
        )[0];
        work.progress_percent = Math.min(100, Math.max(0, Number(latest.percentage) || 0));
        return { error: null };
      },
    };
  },
};

await insertWorkProgressRecord({ supabase, payload });
assert.equal(work.progress_percent, 70, "database trigger's latest cumulative SAL percentage must remain authoritative");
assert.equal(calls.length, 1, "only one insert is issued");
assert.equal(calls[0].operation, "insert");
assert.equal(calls[0].payload.percentage, 70);

const failingSupabase = {
  from(table) {
    assert.equal(table, "condominium_work_progress");
    return {
      async insert() {
        return { error: new Error("insert failed") };
      },
    };
  },
};
await assert.rejects(
  insertWorkProgressRecord({ supabase: failingSupabase, payload }),
  /insert failed/,
  "SAL insert errors must still propagate"
);

console.log("PASS: SAL cumulative progress remains trigger-owned; client does not double-count percentages.");
