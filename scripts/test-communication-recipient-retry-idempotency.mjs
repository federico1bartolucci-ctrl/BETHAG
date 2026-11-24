import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationDir = "supabase/migrations";
const baselineNames = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const accessMigrationName = "20261102200855_restore_secure_communication_recipient_rpc_execute.sql";
const retryMigrationName = "20261124141500_preserve_communication_recipient_ids_on_retry.sql";
const actualNames = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
assert.ok(actualNames.includes(accessMigrationName), "The authenticated communication RPC grant migration must exist.");
assert.ok(!actualNames.includes(retryMigrationName), "The proposed retry migration must remain outside the frozen deployable sequence until a new release freeze is approved.");
assert.equal(actualNames.length, 28, "The frozen deployable migration sequence must remain at 28 files.");

const [schemaSql, indexSql, functionSql, securitySql, grantSql, accessSql, retrySql] = await Promise.all([
  ...baselineNames.map((name) => readFile(`${migrationDir}/${name}`, "utf8")),
  readFile(`${migrationDir}/${accessMigrationName}`, "utf8"),
  readFile(`supabase/rebuild/drafts/${retryMigrationName}`, "utf8"),
]);

const prepareStart = retrySql.indexOf("CREATE OR REPLACE FUNCTION private.prepare_communication_recipients");
const resetStart = retrySql.indexOf("CREATE OR REPLACE FUNCTION private.reset_stale_communication_recipients");
const grantsStart = retrySql.indexOf("GRANT USAGE ON SCHEMA private");
assert.ok(prepareStart >= 0 && resetStart > prepareStart && grantsStart > resetStart);
const prepareSql = retrySql.slice(prepareStart, resetStart);
const resetSql = retrySql.slice(resetStart, grantsStart);
assert.doesNotMatch(prepareSql, /DELETE\s+FROM\s+public\.communication_recipients/i, "Preparation must not delete pending rows and regenerate recipient UUIDs.");
assert.match(prepareSql, /UPDATE public\.communication_recipients r\s+SET status = 'pending'[\s\S]*WHERE r\.communication_id = p_communication_id[\s\S]*AND r\.status = 'failed'/i);
assert.match(prepareSql, /ON CONFLICT \(communication_id, LOWER\(BTRIM\(email\)\)\) DO UPDATE/i);
assert.doesNotMatch(prepareSql.slice(prepareSql.indexOf("ON CONFLICT"), prepareSql.indexOf("SELECT COUNT")), /\b(?:id|status)\s*=/i, "The conflict update must not replace recipient identity or delivery state.");
assert.match(prepareSql, /status = 'skipped'[\s\S]*provider_event_id/i);
assert.match(resetSql, /status = 'skipped'[\s\S]*Invio interrotto con esito provider non verificabile/i);
assert.match(resetSql, /provider_message_id/i);

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
  `);

  const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
  for (const match of grantSql.matchAll(/\bTO\s+("(?:\"\"|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role.toUpperCase() !== "PUBLIC" && role !== "postgres") roles.add(role);
  }
  for (const match of grantSql.matchAll(/\bFOR ROLE\s+("(?:\"\"|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role !== "postgres") roles.add(role);
  }
  for (const role of [...roles].sort()) {
    const existing = await db.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    if (existing.rows.length === 0) await db.exec(`CREATE ROLE "${role.replace(/"/g, '""')}"`);
  }

  const baseline = [schemaSql, indexSql, functionSql, securitySql, grantSql].map((sql) =>
    sql.replace(/^CREATE EXTENSION IF NOT EXISTS .*;\s*$/gm, "")
      .replace(/^ALTER TABLE .* ADD CONSTRAINT .* EXCLUDE USING gist .*;\s*$/gm, "")
  );
  for (let index = 0; index < baseline.length; index += 1) {
    try {
      await db.exec(baseline[index]);
    } catch (error) {
      throw new Error(`Baseline migration ${baselineNames[index]} failed: ${error.message}`, { cause: error });
    }
  }

  await db.exec(accessSql);
  await db.exec(retrySql);

  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const workspaceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const condominiumId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const communicationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const activeMemberId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const failedRecipientId = "11111111-1111-4111-8111-111111111111";
  const acceptedRecipientId = "22222222-2222-4222-8222-222222222222";
  const ambiguousRecipientId = "33333333-3333-4333-8333-333333333333";
  const inactiveRecipientId = "44444444-4444-4444-8444-444444444444";
  const staleQueuedId = "55555555-5555-4555-8555-555555555555";
  const acceptedQueuedId = "66666666-6666-4666-8666-666666666666";

  await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${userId}'::uuid $$;`);
  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [userId]);
  await db.query("INSERT INTO public.profiles(id,full_name,email,role,active) VALUES ($1,'Retry Test Admin','retry-admin@example.it','admin',true)", [userId]);
  await db.query("INSERT INTO public.workspaces(id,name) VALUES ($1,'Retry test workspace')", [workspaceId]);
  await db.query(
    "INSERT INTO public.workspace_members(workspace_id,user_id,role,active) VALUES ($1,$2,'admin',true)",
    [workspaceId, userId],
  );
  await db.query("INSERT INTO public.condominiums(id,workspace_id,name) VALUES ($1,$2,'Retry test condominium')", [condominiumId, workspaceId]);
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,name,email,role,active) VALUES ($1,$2,'Mario Rossi','mario@example.it','owner',true)",
    [activeMemberId, condominiumId],
  );
  await db.query(
    "INSERT INTO public.communications(id,workspace_id,condominium_id,title,body,published) VALUES ($1,$2,$3,'Test','Body',true)",
    [communicationId, workspaceId, condominiumId],
  );

  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,member_id,email,name,recipient_role,status,error_message)
     VALUES ($1,$2,$3,$4,$5,'mario@example.it','Mario old','owner','failed','Temporary network failure')`,
    [failedRecipientId, communicationId, workspaceId, condominiumId, activeMemberId],
  );

  const firstPrepare = await db.query(
    "SELECT private.prepare_communication_recipients($1) AS result",
    [communicationId],
  );
  const firstRetry = await db.query(
    "SELECT id::text,status,provider_message_id,error_message FROM public.communication_recipients WHERE communication_id=$1 AND email='mario@example.it'",
    [communicationId],
  );
  assert.equal(firstPrepare.rows[0].result.retried_failed, 1);
  assert.equal(firstRetry.rows.length, 1);
  assert.equal(firstRetry.rows[0].id, failedRecipientId, "Retry must preserve the original recipient UUID.");
  assert.equal(firstRetry.rows[0].status, "pending");
  assert.equal(firstRetry.rows[0].provider_message_id, null);
  const originalIdempotencyKey = `bethag-communication-recipient-${failedRecipientId}`;
  assert.equal(`bethag-communication-recipient-${firstRetry.rows[0].id}`, originalIdempotencyKey);

  await db.query("SELECT private.prepare_communication_recipients($1)", [communicationId]);
  const repeatedPrepare = await db.query(
    "SELECT id::text,status FROM public.communication_recipients WHERE communication_id=$1 AND email='mario@example.it'",
    [communicationId],
  );
  assert.equal(repeatedPrepare.rows.length, 1, "Repeated preparation must not duplicate the active recipient.");
  assert.equal(repeatedPrepare.rows[0].id, failedRecipientId, "Repeated preparation must keep the provider idempotency key stable.");
  assert.equal(repeatedPrepare.rows[0].status, "pending");

  const acceptedMemberId = "77777777-7777-4777-8777-777777777777";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,name,email,role,active) VALUES ($1,$2,'Anna Bianchi','anna@example.it','owner',true)",
    [acceptedMemberId, condominiumId],
  );
  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,member_id,email,name,recipient_role,status,provider_message_id,error_message)
     VALUES ($1,$2,$3,$4,$5,'anna@example.it','Anna','owner','failed','re_accepted_123','stale failure')`,
    [acceptedRecipientId, communicationId, workspaceId, condominiumId, acceptedMemberId],
  );
  await db.query("SELECT private.prepare_communication_recipients($1)", [communicationId]);
  const accepted = await db.query(
    "SELECT id::text,status,provider_message_id FROM public.communication_recipients WHERE id=$1",
    [acceptedRecipientId],
  );
  assert.equal(accepted.rows[0].id, acceptedRecipientId);
  assert.equal(accepted.rows[0].status, "sent", "Provider acceptance evidence must never return to pending.");
  assert.equal(accepted.rows[0].provider_message_id, "re_accepted_123");

  const ambiguousMemberId = "88888888-8888-4888-8888-888888888888";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,name,email,role,active) VALUES ($1,$2,'Luca Verdi','luca@example.it','owner',true)",
    [ambiguousMemberId, condominiumId],
  );
  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,member_id,email,name,recipient_role,status,provider_event_id,event_type)
     VALUES ($1,$2,$3,$4,$5,'luca@example.it','Luca','owner','failed','evt_ambiguous_1','email.delivered')`,
    [ambiguousRecipientId, communicationId, workspaceId, condominiumId, ambiguousMemberId],
  );
  await db.query("SELECT private.prepare_communication_recipients($1)", [communicationId]);
  const ambiguous = await db.query(
    "SELECT id::text,status,error_message FROM public.communication_recipients WHERE id=$1",
    [ambiguousRecipientId],
  );
  assert.equal(ambiguous.rows[0].id, ambiguousRecipientId);
  assert.equal(ambiguous.rows[0].status, "skipped", "Provider event evidence without a message ID must fail closed.");
  assert.match(ambiguous.rows[0].error_message, /verifica manuale/i);

  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,email,name,recipient_role,status)
     VALUES ($1,$2,$3,$4,'removed@example.it','Removed','owner','pending')`,
    [inactiveRecipientId, communicationId, workspaceId, condominiumId],
  );
  await db.query("SELECT private.prepare_communication_recipients($1)", [communicationId]);
  const inactive = await db.query(
    "SELECT id::text,status FROM public.communication_recipients WHERE id=$1",
    [inactiveRecipientId],
  );
  assert.equal(inactive.rows[0].id, inactiveRecipientId);
  assert.equal(inactive.rows[0].status, "skipped", "A no-longer-active pending recipient must be retained but excluded from sending.");

  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,email,name,recipient_role,status,queued_at)
     VALUES ($1,$2,$3,$4,'stale@example.it','Stale','owner','queued',now()-interval '1 hour')`,
    [staleQueuedId, communicationId, workspaceId, condominiumId],
  );
  await db.query(
    `INSERT INTO public.communication_recipients
      (id,communication_id,workspace_id,condominium_id,email,name,recipient_role,status,provider_message_id,queued_at)
     VALUES ($1,$2,$3,$4,'accepted-queued@example.it','Accepted','owner','queued','re_queued_123',now()-interval '1 hour')`,
    [acceptedQueuedId, communicationId, workspaceId, condominiumId],
  );
  const reset = await db.query(
    "SELECT private.reset_stale_communication_recipients($1, interval '15 minutes') AS result",
    [communicationId],
  );
  const stale = await db.query(
    "SELECT id::text,status,queued_at,error_message FROM public.communication_recipients WHERE id=$1",
    [staleQueuedId],
  );
  const acceptedQueued = await db.query(
    "SELECT id::text,status,provider_message_id,queued_at FROM public.communication_recipients WHERE id=$1",
    [acceptedQueuedId],
  );
  assert.equal(reset.rows[0].result.manual_review, 1);
  assert.equal(reset.rows[0].result.resolved_provider_acceptance, 1);
  assert.equal(stale.rows[0].id, staleQueuedId);
  assert.equal(stale.rows[0].status, "skipped", "Stale ambiguous queued work must not be automatically resent.");
  assert.equal(stale.rows[0].queued_at, null);
  assert.match(stale.rows[0].error_message, /verifica manuale/i);
  assert.equal(acceptedQueued.rows[0].id, acceptedQueuedId);
  assert.equal(acceptedQueued.rows[0].status, "sent");
  assert.equal(acceptedQueued.rows[0].provider_message_id, "re_queued_123");
  assert.equal(acceptedQueued.rows[0].queued_at, null);

  console.log("Communication recipient retry idempotency PostgreSQL runtime regression: PASS");
} finally {
  await db.close();
}
