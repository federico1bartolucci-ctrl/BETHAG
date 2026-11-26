import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261123090000_guard_resend_webhook_status_event_order.sql";
const migration = await readFile(migrationPath, "utf8");
const aggregateMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125054500_serialize_resend_webhook_communication_aggregate.sql";
const aggregateMigration = await readFile(aggregateMigrationPath, "utf8");
const baselineFunctionsPath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const baselineFunctions = await readFile(baselineFunctionsPath, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-resend-webhook-event-order\.mjs/, "Runtime regression must be wired into npm test.");

for (const [name, sql] of [["event-order migration", migration], ["aggregate migration", aggregateMigration]]) {
  assert.match(sql, /'email\.failed', 'email\.suppressed'/,
    name + " must classify Resend failed and suppressed events as delivery-state events.");
  assert.match(sql, /WHEN 'email\.failed' THEN 'failed'/,
    name + " must map email.failed to the terminal failed recipient state.");
  assert.match(sql, /WHEN 'email\.suppressed' THEN 'failed'/,
    name + " must map email.suppressed to the terminal failed recipient state.");
}

const baselineFunctionStart = baselineFunctions.indexOf("CREATE OR REPLACE FUNCTION private.apply_resend_communication_event(");
const baselineFunctionEnd = baselineFunctions.indexOf("$function$\n;", baselineFunctionStart);
assert.ok(baselineFunctionStart >= 0 && baselineFunctionEnd > baselineFunctionStart, "Baseline webhook SQL function must be extracted for reproduction.");
const baselineFunctionSql = baselineFunctions.slice(baselineFunctionStart, baselineFunctionEnd + 11);

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA private;
    CREATE TABLE public.communications (
      id uuid PRIMARY KEY,
      email_status text,
      updated_at timestamptz
    );
    CREATE TABLE public.communication_recipients (
      id uuid PRIMARY KEY,
      communication_id uuid NOT NULL,
      email text NOT NULL,
      status text NOT NULL,
      provider_message_id text NOT NULL,
      error_message text,
      sent_at timestamptz,
      delivered_at timestamptz,
      bounced_at timestamptz,
      complained_at timestamptz,
      updated_at timestamptz,
      event_type text,
      provider_event_id text,
      provider_status_event_at timestamptz,
      provider_status_event_id text
    );
    CREATE UNIQUE INDEX communication_recipients_provider_event_uq
      ON public.communication_recipients(provider_event_id)
      WHERE provider_event_id IS NOT NULL;
    INSERT INTO public.communications(id, email_status)
      VALUES ('00000000-0000-0000-0000-000000000001', 'In elaborazione');
    INSERT INTO public.communication_recipients(
      id, communication_id, email, status, provider_message_id, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'resident1@example.it', 'queued', 'msg-1', now()
    );
    INSERT INTO public.communications(id, email_status) VALUES
      ('00000000-0000-0000-0000-000000000004', 'In elaborazione'),
      ('00000000-0000-0000-0000-000000000006', 'In elaborazione'),
      ('00000000-0000-0000-0000-000000000008', 'In elaborazione'),
      ('00000000-0000-0000-0000-000000000010', 'In elaborazione'),
      ('00000000-0000-0000-0000-000000000012', 'Consegnata');
    INSERT INTO public.communication_recipients(
      id, communication_id, email, status, provider_message_id, updated_at,
      provider_status_event_at, provider_status_event_id
    ) VALUES
      ('00000000-0000-0000-0000-000000000005',
       '00000000-0000-0000-0000-000000000004',
       'failed@example.it', 'sent', 'msg-failed', now(),
       '2026-11-26T08:00:00Z', 'evt-sent-before-failure'),
      ('00000000-0000-0000-0000-000000000007',
       '00000000-0000-0000-0000-000000000006',
       'suppressed@example.it', 'queued', 'msg-suppressed', now(), NULL, NULL),
      ('00000000-0000-0000-0000-000000000009',
       '00000000-0000-0000-0000-000000000008',
       'newfailed@example.it', 'queued', 'msg-failed-new', now(), NULL, NULL),
      ('00000000-0000-0000-0000-000000000011',
       '00000000-0000-0000-0000-000000000010',
       'newsuppressed@example.it', 'queued', 'msg-suppressed-new', now(), NULL, NULL);
    INSERT INTO public.communication_recipients(
      id, communication_id, email, status, provider_message_id, delivered_at,
      event_type, provider_event_id, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000013',
      '00000000-0000-0000-0000-000000000012',
      'alreadydelivered@example.it', 'delivered', 'msg-suppressed-after-delivery',
      '2026-11-26T08:09:00Z', 'email.suppressed',
      'evt-suppressed-after-delivery', '2026-11-26T08:10:00Z'
    );
  `);

  // Run the actual baseline function first and prove that a delayed delivered event regresses a complaint.
  await db.exec(baselineFunctionSql);
  async function apply(messageId, eventId, eventType, email, eventAt) {
    const result = await db.query(
      "SELECT private.apply_resend_communication_event($1, $2, $3, $4, $5) AS result",
      [messageId, eventId, eventType, email, eventAt],
    );
    return result.rows[0].result;
  }

  // Reproduce the missing terminal mappings in the baseline function: both
  // signed provider events are recorded as metadata but leave recipients queued.
  const failedAt = "2026-11-26T08:11:00Z";
  const suppressedAt = "2026-11-26T08:12:00Z";
  const baselineFailed = await apply("msg-failed", "evt-failed", "email.failed", "failed@example.it", failedAt);
  assert.equal(baselineFailed.status, "updated");
  const baselineSuppressed = await apply("msg-suppressed", "evt-suppressed", "email.suppressed", "suppressed@example.it", suppressedAt);
  assert.equal(baselineSuppressed.status, "updated");
  const baselineTerminalRows = await db.query(
    "SELECT provider_message_id, status, event_type, provider_event_id FROM public.communication_recipients WHERE provider_message_id IN ('msg-failed', 'msg-suppressed') ORDER BY provider_message_id",
  );
  assert.deepEqual(baselineTerminalRows.rows.map((row) => [row.status, row.event_type]), [
    ["sent", "email.failed"],
    ["queued", "email.suppressed"],
  ], "Baseline defect reproduced: terminal provider failures are stored only as metadata and leave recipients sent/queued.");
  const baselineTerminalAggregates = await db.query(
    "SELECT id, email_status FROM public.communications WHERE id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006') ORDER BY id",
  );
  assert.deepEqual(baselineTerminalAggregates.rows.map((row) => row.email_status), [
    "Inviata",
    "In elaborazione",
  ], "Baseline defect reproduced: failed/suppressed metadata leaves the recipient and parent aggregate at their previous sent/in-progress state.");
  await db.exec(`
    UPDATE public.communication_recipients
    SET updated_at = CASE provider_message_id
      WHEN 'msg-failed' THEN '${failedAt}'::timestamptz
      WHEN 'msg-suppressed' THEN '${suppressedAt}'::timestamptz
      ELSE updated_at
    END
    WHERE provider_message_id IN ('msg-failed', 'msg-suppressed');
  `);
  const baselineSent = await apply("msg-1", "evt-sent", "email.sent", "resident1@example.it", "2026-11-23T08:00:00Z");
  assert.equal(baselineSent.status, "updated");
  await apply("msg-1", "evt-delivered", "email.delivered", "resident1@example.it", "2026-11-23T08:02:00Z");
  await apply("msg-1", "evt-complaint", "email.complained", "resident1@example.it", "2026-11-23T08:10:00Z");
  await apply("msg-1", "evt-delivered", "email.delivered", "resident1@example.it", "2026-11-23T08:02:00Z");
  const baselineRecipient = await db.query(
    "SELECT status, error_message, provider_event_id FROM public.communication_recipients WHERE id = $1",
    ["00000000-0000-0000-0000-000000000002"],
  );
  assert.equal(baselineRecipient.rows[0].status, "delivered", "Baseline defect reproduced: older delivered event overwrites the newer complaint.");
  assert.equal(baselineRecipient.rows[0].error_message, "email.complained", "Baseline leaves contradictory complaint text behind.");
  assert.equal(baselineRecipient.rows[0].provider_event_id, "evt-delivered");
  const baselineCommunication = await db.query(
    "SELECT email_status FROM public.communications WHERE id = $1",
    ["00000000-0000-0000-0000-000000000001"],
  );
  assert.equal(baselineCommunication.rows[0].email_status, "Consegnata", "Baseline incorrectly reports delivery after replay.");
  console.log("PASS baseline SQL reproduction: stale delivered replay overwrites complaint status and communication aggregate.");

  // Reset the first recipient, add a pre-migration delivered row, then apply the proposed-forward fix.
  await db.exec(`
    UPDATE public.communication_recipients
    SET status = 'queued', error_message = NULL, sent_at = NULL, delivered_at = NULL,
        bounced_at = NULL, complained_at = NULL, updated_at = now(), event_type = NULL,
        provider_event_id = NULL, provider_status_event_at = NULL, provider_status_event_id = NULL
    WHERE id = '00000000-0000-0000-0000-000000000002';
    UPDATE public.communications
    SET email_status = 'In elaborazione', updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
    INSERT INTO public.communication_recipients(
      id, communication_id, email, status, provider_message_id, delivered_at,
      event_type, provider_event_id, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001',
      'resident2@example.it', 'delivered', 'msg-2',
      '2026-11-23T08:00:00Z', 'email.delivered', 'evt-2-delivered', now()
    );
  `);
  await db.exec(migration);
  await db.exec(aggregateMigration);

  async function recipient(id) {
    const result = await db.query(
      "SELECT status, error_message, delivered_at, bounced_at, complained_at, provider_event_id, event_type, provider_status_event_at, provider_status_event_id FROM public.communication_recipients WHERE id = $1",
      [id],
    );
    assert.equal(result.rows.length, 1);
    return result.rows[0];
  }

  // The forward migration repairs already-recorded failed/suppressed events
  // and recomputes their parent communication aggregate.
  const repairedFailed = await recipient("00000000-0000-0000-0000-000000000005");
  assert.equal(repairedFailed.status, "failed");
  assert.equal(repairedFailed.error_message, "email.failed");
  assert.equal(repairedFailed.provider_status_event_id, "evt-failed");
  assert.equal(Date.parse(repairedFailed.provider_status_event_at), Date.parse(failedAt));
  const repairedFailedAggregate = await db.query(
    "SELECT email_status FROM public.communications WHERE id = '00000000-0000-0000-0000-000000000004'",
  );
  assert.equal(repairedFailedAggregate.rows[0].email_status, "Errore");

  const repairedSuppressed = await recipient("00000000-0000-0000-0000-000000000007");
  assert.equal(repairedSuppressed.status, "failed");
  assert.equal(repairedSuppressed.error_message, "email.suppressed");
  assert.equal(repairedSuppressed.provider_status_event_id, "evt-suppressed");
  assert.equal(Date.parse(repairedSuppressed.provider_status_event_at), Date.parse(suppressedAt));
  const repairedSuppressedAggregate = await db.query(
    "SELECT email_status FROM public.communications WHERE id = '00000000-0000-0000-0000-000000000006'",
  );
  assert.equal(repairedSuppressedAggregate.rows[0].email_status, "Errore");

  // A previously delivered recipient must never be downgraded by repairing
  // metadata left by a later/out-of-order suppressed event.
  const preservedDelivered = await recipient("00000000-0000-0000-0000-000000000013");
  assert.equal(preservedDelivered.status, "delivered");
  assert.equal(preservedDelivered.provider_status_event_id, "evt-suppressed-after-delivery");
  assert.equal(Date.parse(preservedDelivered.provider_status_event_at), Date.parse("2026-11-26T08:10:00Z"));
  const preservedDeliveredAggregate = await db.query(
    "SELECT email_status FROM public.communications WHERE id = '00000000-0000-0000-0000-000000000012'",
  );
  assert.equal(preservedDeliveredAggregate.rows[0].email_status, "Consegnata");

  // New terminal failure events must be applied, and later-arriving older or
  // equal-time success events must not downgrade the failed recipient.
  const newFailed = await apply("msg-failed-new", "evt-failed-new", "email.failed", "newfailed@example.it", "2026-11-26T08:20:00Z");
  assert.equal(newFailed.status, "updated");
  assert.equal((await recipient("00000000-0000-0000-0000-000000000009")).status, "failed");
  const newFailedAggregate = await db.query(
    "SELECT email_status FROM public.communications WHERE id = '00000000-0000-0000-0000-000000000008'",
  );
  assert.equal(newFailedAggregate.rows[0].email_status, "Errore");
  const newSuppressed = await apply("msg-suppressed-new", "evt-suppressed-new", "email.suppressed", "newsuppressed@example.it", "2026-11-26T08:21:00Z");
  assert.equal(newSuppressed.status, "updated");
  const newSuppressedRecipient = await recipient("00000000-0000-0000-0000-000000000011");
  assert.equal(newSuppressedRecipient.status, "failed");
  assert.equal(newSuppressedRecipient.error_message, "email.suppressed");
  const newSuppressedAggregate = await db.query(
    "SELECT email_status FROM public.communications WHERE id = '00000000-0000-0000-0000-000000000010'",
  );
  assert.equal(newSuppressedAggregate.rows[0].email_status, "Errore");
  const staleDeliveryAfterSuppression = await apply("msg-suppressed-new", "evt-old-delivered-after-suppressed", "email.delivered", "newsuppressed@example.it", "2026-11-26T08:20:00Z");
  assert.deepEqual(staleDeliveryAfterSuppression, { status: "ignored", reason: "stale_status_event", current_status: "failed" });
  const duplicateSuppressed = await apply("msg-suppressed-new", "evt-suppressed-new", "email.suppressed", "newsuppressed@example.it", "2026-11-26T08:21:00Z");
  assert.deepEqual(duplicateSuppressed, { status: "ignored", reason: "duplicate_status_event", current_status: "failed" });
  const staleSuccessAfterFailure = await apply("msg-failed-new", "evt-old-delivered-after-failed", "email.delivered", "newfailed@example.it", "2026-11-26T08:19:00Z");
  assert.deepEqual(staleSuccessAfterFailure, { status: "ignored", reason: "stale_status_event", current_status: "failed" });
  const equalTimeSuccessAfterFailure = await apply("msg-failed-new", "evt-equal-delivered-after-failed", "email.delivered", "newfailed@example.it", "2026-11-26T08:20:00Z");
  assert.deepEqual(equalTimeSuccessAfterFailure, { status: "ignored", reason: "stale_status_event", current_status: "failed" });
  const duplicateFailed = await apply("msg-failed-new", "evt-failed-new", "email.failed", "newfailed@example.it", "2026-11-26T08:20:00Z");
  assert.deepEqual(duplicateFailed, { status: "ignored", reason: "duplicate_status_event", current_status: "failed" });

  const sent = await apply("msg-1", "evt-sent", "email.sent", "resident1@example.it", "2026-11-23T08:00:00Z");
  assert.equal(sent.status, "updated");
  assert.equal((await recipient("00000000-0000-0000-0000-000000000002")).status, "sent");

  // A temporary delivery delay is informational and must not become terminal.
  const delayed = await apply("msg-1", "evt-delayed", "email.delivery_delayed", "resident1@example.it", "2026-11-23T08:01:00Z");
  assert.equal(delayed.status, "updated");
  const afterDelay = await recipient("00000000-0000-0000-0000-000000000002");
  assert.equal(afterDelay.status, "sent");
  assert.equal(afterDelay.provider_status_event_id, "evt-sent");
  assert.equal(Date.parse(afterDelay.provider_status_event_at), Date.parse("2026-11-23T08:00:00Z"));

  const delivered = await apply("msg-1", "evt-delivered", "email.delivered", "resident1@example.it", "2026-11-23T08:02:00Z");
  assert.equal(delivered.status, "updated");
  assert.equal((await recipient("00000000-0000-0000-0000-000000000002")).status, "delivered");

  const complaint = await apply("msg-1", "evt-complaint", "email.complained", "resident1@example.it", "2026-11-23T08:10:00Z");
  assert.equal(complaint.status, "updated");
  assert.equal((await recipient("00000000-0000-0000-0000-000000000002")).status, "failed");

  // An informational event must not advance the delivery-state cursor.
  const opened = await apply("msg-1", "evt-opened", "email.opened", "resident1@example.it", "2026-11-23T08:15:00Z");
  assert.equal(opened.status, "updated");
  const afterOpened = await recipient("00000000-0000-0000-0000-000000000002");
  assert.equal(afterOpened.event_type, "email.opened");
  assert.equal(afterOpened.provider_event_id, "evt-opened");
  assert.equal(afterOpened.provider_status_event_id, "evt-complaint");
  assert.equal(Date.parse(afterOpened.provider_status_event_at), Date.parse("2026-11-23T08:10:00Z"));

  // Replay the older delivered event after a later complaint: it must not regress FAILED to DELIVERED.
  const staleDelivered = await apply("msg-1", "evt-delivered", "email.delivered", "resident1@example.it", "2026-11-23T08:02:00Z");
  assert.deepEqual(staleDelivered, { status: "ignored", reason: "stale_status_event", current_status: "failed" });

  // Equal-timestamp delivered must not downgrade a complaint (timestamp granularity can collide).
  const sameTimestampDelivered = await apply("msg-1", "evt-delivered-same-time", "email.delivered", "resident1@example.it", "2026-11-23T08:10:00Z");
  assert.deepEqual(sameTimestampDelivered, { status: "ignored", reason: "stale_status_event", current_status: "failed" });

  const duplicateComplaint = await apply("msg-1", "evt-complaint", "email.complained", "resident1@example.it", "2026-11-23T08:10:00Z");
  assert.deepEqual(duplicateComplaint, { status: "ignored", reason: "duplicate_status_event", current_status: "failed" });

  const staleBounce = await apply("msg-1", "evt-bounce-old", "email.bounced", "resident1@example.it", "2026-11-23T08:09:00Z");
  assert.deepEqual(staleBounce, { status: "ignored", reason: "stale_status_event", current_status: "failed" });

  const finalRecipient = await recipient("00000000-0000-0000-0000-000000000002");
  assert.equal(finalRecipient.status, "failed");
  assert.equal(finalRecipient.error_message, "email.complained");
  assert.equal(finalRecipient.provider_status_event_id, "evt-complaint");
  assert.equal(Date.parse(finalRecipient.provider_status_event_at), Date.parse("2026-11-23T08:10:00Z"));

  // Existing rows are backfilled and stale events cannot override their delivery outcome.
  const staleForExisting = await apply("msg-2", "evt-2-old-bounce", "email.bounced", "resident2@example.it", "2026-11-23T07:59:00Z");
  assert.deepEqual(staleForExisting, { status: "ignored", reason: "stale_status_event", current_status: "delivered" });
  const existingRecipient = await recipient("00000000-0000-0000-0000-000000000003");
  assert.equal(existingRecipient.status, "delivered");
  assert.equal(existingRecipient.provider_status_event_id, "evt-2-delivered");
  assert.equal(Date.parse(existingRecipient.provider_status_event_at), Date.parse("2026-11-23T08:00:00Z"));

  const communication = await db.query(
    "SELECT email_status FROM public.communications WHERE id = $1",
    ["00000000-0000-0000-0000-000000000001"],
  );
  assert.equal(communication.rows[0].email_status, "Parzialmente inviata");

  console.log("PASS proposed-forward SQL runtime: email.failed/email.suppressed are terminal, legacy rows repaired, stale/duplicate events ignored, and delivery-delay/open events remain informational.");
} finally {
  await db.close();
}
