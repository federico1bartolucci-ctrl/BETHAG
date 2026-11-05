import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const projectUrl = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key, "BETHAG_QA_SERVICE_ROLE_KEY is required");

const db = createClient(projectUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
const workspace = await db.from("workspaces").select("id").eq("name", "BETHAG_QA_FIXTURE_20261102").single();
assert.ifError(workspace.error);

const marker = "BETHAG_QA_SIGNED_WEBHOOK_" + Date.now();
const secret = "whsec_" + randomBytes(32).toString("base64");
const recipientIds = [];
let communicationId = null;
let server;
let serverOutput = "";

const events = [
  { type: "email.sent", suffix: "delivered", email: "app12-delivered-" + Date.now() + "@example.invalid" },
  { type: "email.sent", suffix: "bounced", email: "app12-bounced-" + Date.now() + "@example.invalid" },
  { type: "email.sent", suffix: "complained", email: "app12-complained-" + Date.now() + "@example.invalid" },
];

async function signedPost(payload, eventId, signatureOverride) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(eventId + "." + timestamp + "." + body)
    .digest("base64");
  const signature = signatureOverride ?? "v1," + digest;
  return fetch("http://127.0.0.1:8000", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": eventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    },
    body,
  });
}

try {
  const created = await db.from("communications").insert({
    workspace_id: workspace.data.id,
    title: marker,
    body: "Synthetic signed webhook acceptance fixture",
    published: false,
    email_status: "In elaborazione",
    data: { bethag_qa_marker: marker },
  }).select("id").single();
  assert.ifError(created.error);
  communicationId = created.data.id;

  const recipients = events.map((event, index) => ({
    communication_id: communicationId,
    workspace_id: workspace.data.id,
    email: event.email,
    name: marker + "_" + event.suffix,
    recipient_role: "resident",
    status: "queued",
    queued_at: new Date().toISOString(),
    provider_message_id: marker + "_provider_" + event.suffix,
  }));
  const inserted = await db.from("communication_recipients").insert(recipients).select("id,provider_message_id,email");
  assert.ifError(inserted.error);
  recipientIds.push(...inserted.data);

  server = spawn("deno", [
    "run", "--node-modules-dir=auto", "--allow-net", "--allow-env",
    "supabase/functions/bethag-resend-webhook/index.ts",
  ], {
    env: {
      ...process.env,
      SUPABASE_URL: projectUrl,
      SUPABASE_SERVICE_ROLE_KEY: key,
      RESEND_WEBHOOK_SIGNING_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
  server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });
  server.on("exit", code => {
    if (code !== null && code !== 0) serverOutput += "\nDeno exited with code " + code;
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:8000");
      if (response.status === 405) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Local webhook handler did not start: " + serverOutput);

  const eventTypes = [
    ["email.sent", 0],
    ["email.delivered", 0],
    ["email.sent", 1],
    ["email.bounced", 1],
    ["email.sent", 2],
    ["email.complained", 2],
  ];
  let counter = 0;
  for (const [type, index] of eventTypes) {
    const recipient = recipientIds[index];
    const eventId = marker + "_event_" + (++counter);
    const payload = {
      type,
      created_at: new Date().toISOString(),
      data: {
        email_id: recipient.provider_message_id,
        to: recipient.email,
        created_at: new Date().toISOString(),
      },
    };
    const response = await signedPost(payload, eventId);
    const result = await response.json();
    assert.equal(response.status, 200, type + " webhook rejected: " + JSON.stringify(result));
    assert.equal(result.status, "updated", type + " did not update recipient");
  }

  const invalidPayload = {
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: recipientIds[0].provider_message_id,
      to: recipientIds[0].email,
      created_at: new Date().toISOString(),
    },
  };
  const invalid = await signedPost(invalidPayload, marker + "_invalid_signature", "v1,invalid");
  assert.equal(invalid.status, 401, "Invalid signature was not rejected");

  const persisted = await db.from("communication_recipients")
    .select("provider_message_id,status,event_type,provider_event_id,delivered_at,bounced_at,complained_at")
    .eq("communication_id", communicationId);
  assert.ifError(persisted.error);
  assert.equal(persisted.data.length, 3);
  const byMessage = new Map(persisted.data.map(row => [row.provider_message_id, row]));
  const delivered = byMessage.get(recipientIds[0].provider_message_id);
  const bounced = byMessage.get(recipientIds[1].provider_message_id);
  const complained = byMessage.get(recipientIds[2].provider_message_id);
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.event_type, "email.delivered");
  assert.ok(delivered.delivered_at);
  assert.equal(bounced.status, "failed");
  assert.equal(bounced.event_type, "email.bounced");
  assert.ok(bounced.bounced_at);
  assert.equal(complained.status, "failed");
  assert.equal(complained.event_type, "email.complained");
  assert.ok(complained.complained_at);

  const communication = await db.from("communications").select("email_status").eq("id", communicationId).single();
  assert.ifError(communication.error);
  assert.equal(communication.data.email_status, "Parzialmente inviata");

  const afterInvalid = await db.from("communication_recipients")
    .select("status,event_type,provider_event_id")
    .eq("id", recipientIds[0].id).single();
  assert.ifError(afterInvalid.error);
  assert.equal(afterInvalid.data.status, "delivered");
  assert.equal(afterInvalid.data.event_type, "email.delivered");
  assert.notEqual(afterInvalid.data.provider_event_id, marker + "_invalid_signature");

  console.log(JSON.stringify({
    suite: "BETHAG_QA_SIGNED_RESEND_WEBHOOK",
    target: "jhuyhlzzydcgghrzeexn",
    status: "PASS",
    checks: [
      "local Edge Function accepted valid Svix signatures for sent/delivered/bounced/complained events",
      "recipient status and event timestamps persisted through the real QA RPC",
      "multiple recipients produced aggregate Parzialmente inviata",
      "invalid signature returned HTTP 401 and caused no database mutation",
      "only synthetic QA recipient and communication rows were created",
    ],
    email_delivery: "NOT SENT — signed synthetic webhook events only",
  }, null, 2));
} finally {
  if (server && !server.killed) server.kill("SIGTERM");
  if (communicationId) {
    const deletedRecipients = await db.from("communication_recipients").delete().eq("communication_id", communicationId);
    assert.ifError(deletedRecipients.error);
    const deletedCommunication = await db.from("communications").delete().eq("id", communicationId);
    assert.ifError(deletedCommunication.error);
  }
  if (communicationId) {
    const remaining = await db.from("communications").select("id").eq("id", communicationId);
    assert.ifError(remaining.error);
    assert.equal(remaining.data.length, 0, "Synthetic webhook communication cleanup failed");
  }
}
