import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateWorkProgressPercentOrReport } from "../src/lib/workProgressPercentUpdate.js";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("async function saveProgress");
const end = source.indexOf("async function saveWorkExpense", start);
assert.ok(start >= 0 && end > start, "saveProgress handler must exist");
const handler = source.slice(start, end);
assert.match(handler, /\.insert\(payload\)\.select\("\*"\)\.single\(\)/, "saved SAL must be returned for partial-success UI");
assert.match(handler, /updateWorkProgressPercentOrReport\(/, "work progress update must use row-count checked helper");
assert.match(handler, /if\(progressUpdateError\)/, "work progress update failures must be handled");
assert.match(handler, /setProgress\(\(current\)=>\[\.\.\.current,insertedProgress\]\)/, "saved SAL must remain visible after secondary update failure");
assert.match(handler, /SAL registrato, ma/, "the UI must report partial success when work progress update fails");
assert.ok(packageJson.scripts.test.includes("test-register-sal-validation-before-insert.mjs"), "PR184 SAL validation test must be wired to npm test");
assert.ok(packageJson.scripts.test.includes("test-register-progress-percent-update-error.mjs"), "progress-percent regression must be wired to npm test");

function mockClient(result) {
  const calls = [];
  const client = {
    from(table) {
      const state = { table, payload: null, filters: [], selected: null };
      const query = {
        update(payload) { state.payload = payload; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        select(columns) { state.selected = columns; return query; },
        maybeSingle() { calls.push(state); return Promise.resolve(result); },
      };
      return query;
    },
  };
  return { client, calls };
}

const success = mockClient({ data: { id: "work-1" }, error: null });
assert.equal(await updateWorkProgressPercentOrReport(success.client, "workspace-1", "work-1", 45), null);
assert.deepEqual(success.calls[0].filters, [["id", "work-1"], ["workspace_id", "workspace-1"]]);
assert.equal(success.calls[0].selected, "id");
assert.deepEqual(success.calls[0].payload, { progress_percent: 45 });

const noRow = mockClient({ data: null, error: null });
const noRowError = await updateWorkProgressPercentOrReport(noRow.client, "workspace-1", "missing-work", 50);
assert.ok(noRowError instanceof Error);
assert.match(noRowError.message, /Intervento non trovato o non aggiornabile/);

const dbFailure = mockClient({ data: null, error: new Error("permission denied") });
assert.equal(
  await updateWorkProgressPercentOrReport(dbFailure.client, "workspace-1", "work-1", 60),
  dbFailure.calls[0]?.error ?? null
);
assert.equal(dbFailure.calls.length, 1);
console.log("Work progress-percent update failure regression checks passed.");
