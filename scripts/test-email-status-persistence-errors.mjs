import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildEmailPersistenceWarning,
  persistEmailStatusUpdate,
  recordEmailPersistenceFailure,
} from "../supabase/functions/_shared/email-status-persistence.mjs";

const source = await readFile("supabase/functions/bethag-send-email/index.ts", "utf8");

assert.match(source, /buildEmailPersistenceWarning/);
assert.match(source, /persistEmailStatusUpdate/);
assert.match(source, /recordEmailPersistenceFailure/);
assert.equal((source.match(/persistEmailStatusUpdate\(/g) ?? []).length, 4, "all three recipient status writes and the communication status write use the safe persistence wrapper");
assert.match(source, /const \{ count: remaining, error: remainingError \}/, "remaining recipient count query captures its error");
assert.match(source, /recordEmailPersistenceFailure\(persistenceState, "remaining recipients query", remainingError\)/, "remaining recipient query errors are recorded");
assert.match(source, /persistenceFailures: persistenceState\.persistenceFailures/, "response exposes the persistence failure count");
assert.match(source, /persistenceWarning: buildEmailPersistenceWarning\(persistenceState\)/, "response builds a persistence warning");
assert.match(source, /I messaggi inviati non devono essere reinviati manualmente senza verifica/, "warning prevents unsafe blind retries");

// Runtime: a returned Supabase error and a thrown transport error are both
// converted into persistence diagnostics, without throwing into send counters.
{
  const state = { persistenceFailures: 0, persistenceFailureDetails: [] };
  assert.equal(buildEmailPersistenceWarning(state), null);
  assert.equal(recordEmailPersistenceFailure(state, "no-op", null), false);
  const success = await persistEmailStatusUpdate(state, "recipient sent", async () => ({ data: null, error: null }));
  assert.equal(success.error, null);
  assert.equal(state.persistenceFailures, 0);

  const returnedFailure = await persistEmailStatusUpdate(state, "recipient sent", async () => ({ data: null, error: { message: "row update denied" } }));
  assert.equal(returnedFailure.error.message, "row update denied");
  assert.equal(state.persistenceFailures, 1);
  assert.deepEqual(state.persistenceFailureDetails, ["recipient sent: row update denied"]);

  const thrownFailure = await persistEmailStatusUpdate(state, "communication status", async () => { throw new Error("network write timeout"); });
  assert.equal(thrownFailure.error.message, "network write timeout");
  assert.equal(state.persistenceFailures, 2);
  assert.deepEqual(state.persistenceFailureDetails, [
    "recipient sent: row update denied",
    "communication status: network write timeout",
  ]);
  assert.match(buildEmailPersistenceWarning(state), /non devono essere reinviati manualmente senza verifica/);
}

// Runtime: a successful Resend response remains counted as sent even when the
// following status write throws; persistence diagnostics are separate from delivery.
{
  const state = { persistenceFailures: 0, persistenceFailureDetails: [] };
  let sent = 0;
  let failed = 0;
  try {
    const resend = { ok: true };
    if (resend.ok) {
      sent += 1;
      const statusWrite = await persistEmailStatusUpdate(state, "recipient 42 sent status", async () => { throw new Error("db unavailable after delivery"); });
      if (statusWrite.error) assert.match(buildEmailPersistenceWarning(state), /non devono essere reinviati manualmente senza verifica/);
    }
  } catch {
    failed += 1;
  }
  assert.equal(sent, 1);
  assert.equal(failed, 0);
  assert.equal(state.persistenceFailures, 1);
  assert.deepEqual(state.persistenceFailureDetails, ["recipient 42 sent status: db unavailable after delivery"]);
}

console.log("Email status persistence runtime regression: PASS (returned errors, thrown errors, successful writes, warning, and delivery-count separation).");
