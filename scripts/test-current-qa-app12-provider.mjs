import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.BETHAG_QA_ADMIN_PASSWORD;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key && password && serviceKey, "QA publishable key, admin password and service key are required");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cleanup = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await admin.auth.signInWithPassword({ email: "bethag-admin-qa@example.com", password });
assert.ifError(login.error);

const marker = "BETHAG_QA_APP12_PROVIDER_" + Date.now();
const legacyCommunicationId = Date.now();
let workspaceId = null;
let condominiumId = null;
let unitId = null;
let memberId = null;
let communicationId = null;
let recipientIds = [];

const must = (result, label) => {
  assert.ifError(result.error, label);
  return result.data;
};

try {
  const workspace = must(
    await admin.from("workspaces").select("id").eq("name", "BETHAG_QA_FIXTURE_20261102").single(),
    "QA workspace",
  );
  workspaceId = workspace.id;

  // Isolated condominium: its only active member uses Resend's documented test recipient.
  // This prevents the send function from ever addressing a real QA resident.
  const condominium = must(await admin.from("condominiums").insert({
    workspace_id: workspaceId,
    name: marker,
    address: "Via QA provider test 1",
    city: "Imola",
    postal_code: "40026",
    province: "BO",
    data: { bethag_qa_marker: marker },
  }).select("id").single(), "provider test condominium");
  condominiumId = condominium.id;

  const unit = must(await admin.from("condominium_units").insert({
    workspace_id: workspaceId,
    condominium_id: condominiumId,
    unit_code: "APP12-PROVIDER-" + Date.now(),
    data: { unitType: "Abitazione", millesimi: "1000", active: true, ownerMode: "condominium_member", ownerMemberIds: [], bethag_qa_marker: marker },
  }).select("id").single(), "provider test unit");
  unitId = unit.id;

  const member = must(await admin.from("condominium_members").insert({
    condominium_id: condominiumId,
    unit_id: unitId,
    name: "Resend QA test recipient",
    email: "delivered@resend.dev",
    role: "resident",
    active: true,
    legacy_id: legacyCommunicationId + 1,
    data: { role: "Proprietario", position_status: "Attivo", current_owner: true, ownership_share: 100, bethag_qa_marker: marker },
  }).select("id").single(), "provider test member");
  memberId = member.id;

  const communication = must(await admin.from("communications").insert({
    workspace_id: workspaceId,
    condominium_id: condominiumId,
    legacy_id: legacyCommunicationId,
    title: marker,
    body: "Messaggio tecnico di collaudo BETHAG: nessun dato personale.",
    published: true,
    email_status: "In elaborazione",
    data: { bethag_qa_marker: marker },
  }).select("id,legacy_id").single(), "provider test communication");
  communicationId = communication.id;
  assert.equal(Number(communication.legacy_id), legacyCommunicationId);

  const prepared = must(await admin.rpc("prepare_communication_recipients", { p_communication_id: communicationId }), "prepare provider recipient");
  assert.equal(prepared.status, "prepared");
  assert.equal(Number(prepared.recipient_count), 1, "Provider test must target exactly one synthetic recipient");

  const recipients = must(await admin.from("communication_recipients")
    .select("id,email,status")
    .eq("communication_id", communicationId), "read provider test recipients");
  assert.equal(recipients.length, 1);
  assert.equal(recipients[0].email, "delivered@resend.dev", "A non-test email address was prepared");
  assert.equal(recipients[0].status, "pending");
  recipientIds = recipients.map(x => x.id);

  const response = await fetch(url + "/functions/v1/bethag-send-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: key,
      Authorization: "Bearer " + login.data.session.access_token,
    },
    body: JSON.stringify({ communicationId: legacyCommunicationId, workspaceId }),
  });
  const payload = await response.json();
  const providerState = must(await admin.from("communication_recipients")
    .select("email,status,error_message,provider_message_id,sent_at")
    .eq("communication_id", communicationId), "capture provider diagnostic before cleanup");
  console.log(JSON.stringify({
    suite: "BETHAG_QA_APP12_PROVIDER_DIAGNOSTIC",
    http_status: response.status,
    function_result: payload,
    recipient_result: providerState.map((row) => ({
      email: row.email,
      status: row.status,
      error_message: row.error_message,
      has_provider_message_id: Boolean(row.provider_message_id),
      has_sent_at: Boolean(row.sent_at),
    })),
  }, null, 2));

  if (response.status === 503 && payload?.error === "Servizio e-mail non configurato.") {
    // The deployed QA function explicitly reports missing RESEND_API_KEY and/or
    // BETHAG_FROM_EMAIL before touching the queue or calling the provider.
    const unchanged = must(await admin.from("communication_recipients")
      .select("id,email,status,provider_message_id,sent_at")
      .eq("communication_id", communicationId), "verify no provider-side mutation");
    assert.equal(unchanged.length, 1);
    assert.equal(unchanged[0].email, "delivered@resend.dev");
    assert.equal(unchanged[0].status, "pending");
    assert.equal(unchanged[0].provider_message_id, null);
    assert.equal(unchanged[0].sent_at, null);
    const communicationState = must(await admin.from("communications")
      .select("email_status").eq("id", communicationId).single(), "verify communication remains prepared");
    assert.equal(communicationState.email_status, "prepared");

    console.log(JSON.stringify({
      suite: "BETHAG_QA_APP12_PROVIDER",
      target: "jhuyhlzzydcgghrzeexn",
      status: "PARTIAL",
      blocker: "The QA Edge Function lacks RESEND_API_KEY and/or BETHAG_FROM_EMAIL.",
      checks: [
        "isolated QA condominium had exactly one active synthetic recipient",
        "recipient address was delivered@resend.dev; no resident address was eligible",
        "deployed function returned its explicit unconfigured-service response before sending",
        "recipient remained pending with no provider_message_id or sent_at",
        "communication remained prepared; no provider call or email delivery occurred",
      ],
      recipient: "delivered@resend.dev",
      email_delivery: "NOT SENT",
    }, null, 2));
  } else {
    assert.equal(response.status, 200, "bethag-send-email returned HTTP " + response.status + ": " + JSON.stringify(payload));
    assert.equal(payload.success, true, "Provider send function did not confirm success: " + JSON.stringify(payload));
    assert.equal(Number(payload.sent), 1, "Expected exactly one provider-accepted test message");
    assert.equal(Number(payload.failed), 0, "Provider reported a failed test message");

    const after = must(await admin.from("communication_recipients")
      .select("id,email,status,provider_message_id,sent_at")
      .eq("communication_id", communicationId), "verify provider result");
    assert.equal(after.length, 1);
    assert.equal(after[0].email, "delivered@resend.dev");
    assert.equal(after[0].status, "sent");
    assert.ok(after[0].provider_message_id, "Resend message ID was not persisted");
    assert.ok(after[0].sent_at, "Sent timestamp was not persisted");

    // Keep the fixture alive until the asynchronous provider callback reaches QA.
    const deliveryDeadline = Date.now() + 90000;
    let delivered = null;
    let lastDeliveryState = null;
    while (Date.now() < deliveryDeadline) {
      const state = must(await admin.from("communication_recipients")
        .select("email,status,event_type,provider_event_id,delivered_at,provider_message_id")
        .eq("communication_id", communicationId)
        .eq("id", after[0].id)
        .single(), "poll real QA delivery callback");
      lastDeliveryState = state;
      // The database RPC applies the delivered state and timestamp, but keeps
      // the first accepted provider event as the recipient's event_type/event_id
      // for audit ordering. The signed synthetic webhook suite separately proves
      // that email.delivered event IDs are accepted and persisted.
      if (state.status === "delivered" &&
          state.delivered_at &&
          state.provider_message_id === after[0].provider_message_id) {
        delivered = state;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    assert.ok(delivered,
      "Resend accepted the message but the signed provider callback did not update the QA recipient within 90 seconds: " +
      JSON.stringify(lastDeliveryState));

    const finalCommunication = must(await admin.from("communications")
      .select("email_status").eq("id", communicationId).single(),
      "verify delivered communication aggregate");
    assert.equal(finalCommunication.email_status, "Consegnata");

    console.log(JSON.stringify({
      suite: "BETHAG_QA_APP12_PROVIDER",
      target: "jhuyhlzzydcgghrzeexn",
      status: "PASS",
      checks: [
        "isolated QA condominium had exactly one synthetic Resend test recipient",
        "deployed bethag-send-email function returned success",
        "Resend accepted exactly one message and provider_message_id/sent_at persisted",
        "dedicated QA webhook verified the provider signature and persisted email.delivered",
        "recipient status, provider event ID, delivered_at and communication aggregate reached delivered/Consegnata before cleanup",
      ],
      recipient: "delivered@resend.dev",
      provider_message_id_persisted: true,
      provider_event_id_persisted: true,
      delivered_at_persisted: true,
      callback_target: "QA",
    }, null, 2));
  }
} finally {
  if (communicationId) {
    const x = await cleanup.from("communication_recipients").delete().eq("communication_id", communicationId);
    assert.ifError(x.error);
    const y = await cleanup.from("communications").delete().eq("id", communicationId);
    assert.ifError(y.error);
  }
  if (memberId) { const x = await cleanup.from("condominium_members").delete().eq("id", memberId); assert.ifError(x.error); }
  if (unitId) { const x = await cleanup.from("condominium_units").delete().eq("id", unitId); assert.ifError(x.error); }
  if (condominiumId) { const x = await cleanup.from("condominiums").delete().eq("id", condominiumId); assert.ifError(x.error); }
  await admin.auth.signOut();

  if (communicationId) {
    const remaining = await cleanup.from("communications").select("id").eq("id", communicationId);
    assert.ifError(remaining.error);
    assert.equal(remaining.data.length, 0, "Provider test communication cleanup failed");
  }
  if (condominiumId) {
    const remaining = await cleanup.from("condominiums").select("id").eq("id", condominiumId);
    assert.ifError(remaining.error);
    assert.equal(remaining.data.length, 0, "Provider test condominium cleanup failed");
  }
}
