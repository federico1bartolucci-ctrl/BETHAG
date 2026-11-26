import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { canCloseWork, closeWorkWithHistory } from "../src/lib/workClosure.mjs";

const legacyCanCloseWork = status => status !== "Completato";
assert.equal(legacyCanCloseWork("Annullato"), true, "the old UI condition incorrectly exposed closure for cancelled work");
assert.equal(canCloseWork("Annullato"), false);
assert.equal(canCloseWork("Completato"), false);
assert.equal(canCloseWork("In corso"), true);
assert.equal(canCloseWork("Sospeso"), true);
assert.equal(canCloseWork("unknown"), false);

const db = new PGlite();
await db.exec(`
  CREATE TABLE condominium_works (
    id text PRIMARY KEY,
    workspace_id text NOT NULL,
    condominium_id text NOT NULL,
    status text NOT NULL,
    progress_percent numeric NOT NULL DEFAULT 0,
    actual_end_date date
  );
  CREATE TABLE condominium_work_events (
    id bigserial PRIMARY KEY,
    workspace_id text NOT NULL,
    condominium_id text NOT NULL,
    work_id text NOT NULL REFERENCES condominium_works(id),
    event_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL DEFAULT 0
  );
`);

async function addWork(id, status) {
  await db.query(
    "INSERT INTO condominium_works(id, workspace_id, condominium_id, status) VALUES ($1, $2, $3, $4)",
    [id, "workspace-1", "condominium-1", status],
  );
}

function databaseCallbacks(workId) {
  return {
    insertHistory: async () => {
      const { rows } = await db.query(
        `INSERT INTO condominium_work_events(workspace_id, condominium_id, work_id, event_type, title, description)
         VALUES ('workspace-1', 'condominium-1', $1, 'Chiusura', 'Intervento completato', 'Chiusura verificata')
         RETURNING id`,
        [workId],
      );
      return { data: rows[0] || null, error: null };
    },
    updateWork: async () => {
      const { rows } = await db.query(
        `UPDATE condominium_works
         SET status = 'Completato', progress_percent = 100, actual_end_date = CURRENT_DATE
         WHERE id = $1
           AND workspace_id = 'workspace-1'
           AND condominium_id = 'condominium-1'
           AND status IN ('Da programmare', 'Approvato', 'In corso', 'Sospeso')
         RETURNING id`,
        [workId],
      );
      return { data: rows[0] || null, error: null };
    },
    deleteHistory: async (eventId) => {
      const { rows } = await db.query(
        `DELETE FROM condominium_work_events
         WHERE id = $1 AND workspace_id = 'workspace-1' AND condominium_id = 'condominium-1'
         RETURNING id`,
        [eventId],
      );
      return { data: rows[0] || null, error: null };
    },
  };
}

await addWork("cancelled-work", "Annullato");
await assert.rejects(
  closeWorkWithHistory(databaseCallbacks("cancelled-work")),
  error => error.message === "WORK_NOT_CLOSABLE_OR_NOT_FOUND",
);
const cancelled = await db.query("SELECT status FROM condominium_works WHERE id = 'cancelled-work'");
const cancelledEvents = await db.query("SELECT id FROM condominium_work_events WHERE work_id = 'cancelled-work'");
assert.equal(cancelled.rows[0].status, "Annullato");
assert.equal(cancelledEvents.rows.length, 0, "a cancelled work must not retain a false closure event after a zero-row update");

await addWork("active-work", "In corso");
await closeWorkWithHistory(databaseCallbacks("active-work"));
const active = await db.query("SELECT status, progress_percent FROM condominium_works WHERE id = 'active-work'");
const activeEvents = await db.query("SELECT id FROM condominium_work_events WHERE work_id = 'active-work'");
assert.equal(active.rows[0].status, "Completato");
assert.equal(Number(active.rows[0].progress_percent), 100);
assert.equal(activeEvents.rows.length, 1, "a successful closure must retain exactly one history event");

await addWork("update-error-work", "In corso");
let updateErrorRollbackCalls = 0;
const updateErrorCallbacks = databaseCallbacks("update-error-work");
const originalDelete = updateErrorCallbacks.deleteHistory;
updateErrorCallbacks.updateWork = async () => ({ data: null, error: new Error("SIMULATED_UPDATE_FAILURE") });
updateErrorCallbacks.deleteHistory = async eventId => {
  updateErrorRollbackCalls += 1;
  return originalDelete(eventId);
};
await assert.rejects(
  closeWorkWithHistory(updateErrorCallbacks),
  error => error.message === "SIMULATED_UPDATE_FAILURE",
);
assert.equal(updateErrorRollbackCalls, 1);
const updateErrorEvents = await db.query("SELECT id FROM condominium_work_events WHERE work_id = 'update-error-work'");
assert.equal(updateErrorEvents.rows.length, 0);

await assert.rejects(
  closeWorkWithHistory({
    insertHistory: async () => ({ data: { id: "event-rollback-failure" }, error: null }),
    updateWork: async () => ({ data: null, error: null }),
    deleteHistory: async () => ({ data: null, error: new Error("SIMULATED_ROLLBACK_FAILURE") }),
  }),
  error => error.message.includes("Rollback dello storico non confermato") &&
    error.message.includes("SIMULATED_ROLLBACK_FAILURE"),
);

let updateAfterInsertFailureCalled = false;
await assert.rejects(
  closeWorkWithHistory({
    insertHistory: async () => ({ data: null, error: new Error("SIMULATED_HISTORY_INSERT_FAILURE") }),
    updateWork: async () => {
      updateAfterInsertFailureCalled = true;
      return { data: { id: "unexpected" }, error: null };
    },
    deleteHistory: async () => ({ data: { id: "unexpected" }, error: null }),
  }),
  error => error.message === "SIMULATED_HISTORY_INSERT_FAILURE",
);
assert.equal(updateAfterInsertFailureCalled, false);

await db.close();

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.ok(source.includes('import { canCloseWork, closeWorkWithHistory } from "./lib/workClosure.mjs";'));
assert.ok(source.includes("if(!canCloseWork(w.status))"));
assert.ok(source.includes('.in("status",["Da programmare","Approvato","In corso","Sospeso"])'));
assert.ok(/\.select\("id"\)\s*\.maybeSingle\(\)/.test(source));
assert.ok(source.includes('{canCloseWork(w.status)&&<button className="secondary-button small" onClick={()=>closeWork(w)}>Chiudi lavoro</button>}'));

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-work-closure-state-guard.mjs"));

console.log("PASS: cancelled work cannot be closed or relabelled as completed.");
console.log("PASS: a zero-row concurrent state transition is detected and its history event is rolled back.");
console.log("PASS: successful active-work closure retains exactly one history event.");
console.log("PASS: update failure and rollback failure are reported without false success.");
console.log("PASS: closure state guard and regression are wired into npm test.");
