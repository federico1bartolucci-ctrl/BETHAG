import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminPassword = process.env.BETHAG_QA_ADMIN_PASSWORD;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key && adminPassword && serviceKey, "QA credentials missing");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cleanup = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await admin.auth.signInWithPassword({
  email: "bethag-admin-qa@example.com",
  password: adminPassword,
});
assert.ifError(signedIn.error);

const marker = "BETHAG_QA_APP09_CARRYOVER_" + Date.now();
const ids = { condominium: null, unit: null, owner: null, sourceYear: null, targetYear: null, transfer: null, memberCarryover: null, unitCarryover: null };
const must = (result, label) => { assert.ifError(result.error, label); return result.data; };

try {
  const workspace = must(await admin.from("workspaces").select("id").eq("name", "BETHAG_QA_FIXTURE_20261102").single(), "workspace");
  const condominium = must(await admin.from("condominiums").insert({
    workspace_id: workspace.id,
    name: marker,
    address: "Via QA carryover",
    city: "Imola",
    postal_code: "40026",
    province: "BO",
    data: { bethag_qa_marker: marker },
  }).select("id").single(), "condominium");
  ids.condominium = condominium.id;

  const unit = must(await admin.from("condominium_units").insert({
    workspace_id: workspace.id,
    condominium_id: ids.condominium,
    unit_code: "T-09-CARRY-" + Date.now(),
    data: { unitType: "Abitazione", millesimi: "1000", active: true, ownerMode: "condominium_member", ownerMemberIds: [], bethag_qa_marker: marker },
  }).select("id").single(), "unit");
  ids.unit = unit.id;

  const owner = must(await admin.from("condominium_members").insert({
    condominium_id: ids.condominium,
    unit_id: ids.unit,
    name: "Cedente carryover QA",
    email: "app09-carryover-" + Date.now() + "@example.com",
    role: "resident",
    active: true,
    legacy_id: Date.now(),
    data: { role: "Proprietario", position_status: "Attivo", current_owner: true, ownership_share: 100, bethag_qa_marker: marker },
  }).select("id").single(), "outgoing owner");
  ids.owner = owner.id;

  // Create both fixture fiscal years as open; the application forbids direct insertion of a closed exercise.
  const source = must(await admin.from("condominium_fiscal_years").insert({
    workspace_id: workspace.id,
    condominium_id: ids.condominium,
    name: marker + " esercizio origine",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    status: "Aperto",
    opening_balance: 0,
    notes: marker,
  }).select("id").single(), "source fiscal year");
  ids.sourceYear = source.id;

  const target = must(await admin.from("condominium_fiscal_years").insert({
    workspace_id: workspace.id,
    condominium_id: ids.condominium,
    name: marker + " esercizio destinazione",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    status: "Aperto",
    opening_balance: 0,
    notes: marker,
  }).select("id").single(), "target fiscal year");
  ids.targetYear = target.id;

  // Close the source year through the supported accounting procedure; direct
  // insertion of a closed fiscal year is intentionally rejected by the app.
  const closedSource = await admin.rpc("close_fiscal_year_and_generate_carryovers", {
    p_workspace_id: workspace.id,
    p_condominium_id: ids.condominium,
    p_source_fiscal_year_id: ids.sourceYear,
  });
  assert.ifError(closedSource.error);

  const incomingEmail = "incoming-app09-" + Date.now() + "@example.com";
  ids.transfer = must(await admin.rpc("confirm_condominium_member_transfer", {
    p_unit_id: ids.unit,
    p_outgoing_member_id: ids.owner,
    p_incoming_name: "Acquirente carryover QA",
    p_incoming_email: incomingEmail,
    p_incoming_user_id: null,
    p_transfer_date: "2026-11-05",
    p_transfer_type: "Vendita",
    p_notes: marker,
    p_data: {
      bethag_qa_marker: marker,
      transfer_scope: "whole_property",
      outgoing_member_ids: [ids.owner],
      incoming_members: [{ name: "Acquirente carryover QA", email: incomingEmail, ownership_share: 100 }],
    },
  }), "confirm transfer");

  // APP-09: a member-level debit carryover must block closure.
  const memberCarryover = must(await cleanup.from("condominium_fiscal_carryovers").insert({
    workspace_id: workspace.id,
    condominium_id: ids.condominium,
    source_fiscal_year_id: ids.sourceYear,
    target_fiscal_year_id: ids.targetYear,
    unit_id: ids.unit,
    member_id: ids.owner,
    balance: 25,
    kind: "Debito",
    status: "Da riportare",
    notes: marker + " member-level",
  }).select("id").single(), "member carryover");
  ids.memberCarryover = memberCarryover.id;

  const memberDenied = await admin.rpc("close_condominium_member_transfer", { p_transfer_id: ids.transfer });
  assert.ok(memberDenied.error?.message.includes("TRANSFER_FINANCIAL_POSITIONS_OPEN"), "Member-level debit carryover did not block closure");
  const afterMemberDenied = must(await admin.from("condominium_member_transfers").select("status").eq("id", ids.transfer).single(), "transfer after member carryover denial");
  assert.equal(afterMemberDenied.status, "Confermato");
  const ownerAfterMemberDenied = must(await admin.from("condominium_members").select("active,data").eq("id", ids.owner).single(), "owner after member carryover denial");
  assert.equal(ownerAfterMemberDenied.active, true);
  assert.equal(ownerAfterMemberDenied.data.position_status, "In chiusura");

  { const removed = await cleanup.from("condominium_fiscal_carryovers").delete().eq("id", ids.memberCarryover); assert.ifError(removed.error); }
  ids.memberCarryover = null;

  // APP-09: a unit-level credit carryover must also block closure.
  const unitCarryover = must(await cleanup.from("condominium_fiscal_carryovers").insert({
    workspace_id: workspace.id,
    condominium_id: ids.condominium,
    source_fiscal_year_id: ids.sourceYear,
    target_fiscal_year_id: ids.targetYear,
    unit_id: ids.unit,
    member_id: null,
    balance: -30,
    kind: "Credito",
    status: "Da riportare",
    notes: marker + " unit-level",
  }).select("id").single(), "unit carryover");
  ids.unitCarryover = unitCarryover.id;

  const unitDenied = await admin.rpc("close_condominium_member_transfer", { p_transfer_id: ids.transfer });
  assert.ok(unitDenied.error?.message.includes("TRANSFER_FINANCIAL_POSITIONS_OPEN"), "Unit-level credit carryover did not block closure");
  const afterUnitDenied = must(await admin.from("condominium_member_transfers").select("status").eq("id", ids.transfer).single(), "transfer after unit carryover denial");
  assert.equal(afterUnitDenied.status, "Confermato");
  const ownerAfterUnitDenied = must(await admin.from("condominium_members").select("active,data").eq("id", ids.owner).single(), "owner after unit carryover denial");
  assert.equal(ownerAfterUnitDenied.active, true);
  assert.equal(ownerAfterUnitDenied.data.position_status, "In chiusura");

  console.log(JSON.stringify({
    suite: "BETHAG_QA_APP09_CARRYOVERS",
    target: "jhuyhlzzydcgghrzeexn",
    status: "PASS",
    checks: [
      "member-level debit carryover blocked transfer closure",
      "unit-level credit carryover blocked transfer closure",
      "transfer stayed Confermato after each rejection",
      "outgoing owner stayed active/In chiusura after each rejection",
    ],
  }, null, 2));
} finally {
  if (ids.memberCarryover) { const x = await cleanup.from("condominium_fiscal_carryovers").delete().eq("id", ids.memberCarryover); assert.ifError(x.error); }
  if (ids.unitCarryover) { const x = await cleanup.from("condominium_fiscal_carryovers").delete().eq("id", ids.unitCarryover); assert.ifError(x.error); }
  if (ids.transfer) { const x = await cleanup.from("condominium_member_transfers").delete().eq("id", ids.transfer); assert.ifError(x.error); }
  if (ids.sourceYear) { const x = await cleanup.from("condominium_fiscal_years").delete().eq("id", ids.sourceYear); assert.ifError(x.error); }
  if (ids.targetYear) { const x = await cleanup.from("condominium_fiscal_years").delete().eq("id", ids.targetYear); assert.ifError(x.error); }
  if (ids.condominium) { const x = await cleanup.from("condominium_members").delete().eq("condominium_id", ids.condominium); assert.ifError(x.error); }
  if (ids.unit) { const x = await cleanup.from("condominium_units").delete().eq("id", ids.unit); assert.ifError(x.error); }
  if (ids.condominium) { const x = await cleanup.from("condominiums").delete().eq("id", ids.condominium); assert.ifError(x.error); }
  await admin.auth.signOut();
}
