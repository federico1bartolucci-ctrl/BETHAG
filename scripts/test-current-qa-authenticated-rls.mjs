import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
const passwords = {
  admin: process.env.BETHAG_QA_ADMIN_PASSWORD,
  collaborator: process.env.BETHAG_QA_COLLABORATOR_PASSWORD,
  resident: process.env.BETHAG_QA_RESIDENT_PASSWORD,
};
assert.ok(passwords.admin && passwords.resident, "Missing QA admin/resident password");
assert.ok(key && serviceKey, "Missing QA publishable/service key");
const fixtureAdmin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const emails = {
  admin: "bethag-admin-qa@example.com",
  collaborator: "bethag-collaboratore-qa@example.com",
  resident: "bethag-condomino-qa@example.com",
};
const clients = {}, userIds = {};
for (const role of ["admin", "resident"]) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: emails[role], password: passwords[role] });
  assert.ifError(error);
  assert.ok(data.session?.access_token, role + " did not receive a session");
  clients[role] = client;
  userIds[role] = data.user.id;
}
const admin = clients.admin, resident = clients.resident;
let collaborator = null;
let temporaryCollaboratorId = null;
const marker = "BETHAG_QA_RLS_" + Date.now();
const workspaceName = "BETHAG_QA_FIXTURE_20261102";
const { data: workspace, error: wErr } = await admin.from("workspaces").select("id").eq("name", workspaceName).single();
assert.ifError(wErr);
const { data: residentPortalLink, error: portalLinkErr } = await admin.from("portal_access").select("condominium_id").eq("workspace_id", workspace.id).eq("user_id", userIds.resident).eq("active", true).limit(1).maybeSingle();
assert.ifError(portalLinkErr); assert.ok(residentPortalLink?.condominium_id, "QA resident has no active portal association");
const { data: condo, error: cErr } = await admin.from("condominiums").select("id,name").eq("workspace_id", workspace.id).eq("id", residentPortalLink.condominium_id).single();
assert.ifError(cErr);
const workspaceId = workspace.id, condominiumId = condo.id;
const results = [];
const record = (name, pass, detail) => results.push({ name, status: pass ? "PASS" : "FAIL", detail });

try {
  if (passwords.collaborator) {
    collaborator = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await collaborator.auth.signInWithPassword({ email: emails.collaborator, password: passwords.collaborator });
    assert.ifError(login.error);
    userIds.collaborator = login.data.user.id;
  } else {
    const temporaryEmail = "bethag-rls-collaborator-" + marker.toLowerCase().replace(/[^a-z0-9]/g, "") + "@example.com";
    const temporaryPassword = randomBytes(24).toString("base64url");
    const created = await fixtureAdmin.auth.admin.createUser({ email: temporaryEmail, password: temporaryPassword, email_confirm: true, user_metadata: { source: marker, role: "collaborator" } });
    assert.ifError(created.error);
    temporaryCollaboratorId = created.data.user.id;
    const membership = await fixtureAdmin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: temporaryCollaboratorId, role: "collaborator", active: true, permissions: ["condomini", "documenti"], legacy_id: Date.now(), data: { name: "BETHAG QA RLS Collaborator", email: temporaryEmail } });
    assert.ifError(membership.error);
    collaborator = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await collaborator.auth.signInWithPassword({ email: temporaryEmail, password: temporaryPassword });
    assert.ifError(login.error);
    userIds.collaborator = login.data.user.id;
  }

  const { data: adminCondos, error: aReadErr } = await admin.from("condominiums").select("id").eq("workspace_id", workspaceId);
  assert.ifError(aReadErr); assert.ok(adminCondos.some(x => x.id === condominiumId));
  record("APP-01 administrator reads own condominium", true, "real Auth session + RLS query");

  const { data: collCondos, error: collReadErr } = await collaborator.from("condominiums").select("id").eq("workspace_id", workspaceId);
  assert.ifError(collReadErr); assert.ok(collCondos.some(x => x.id === condominiumId));
  const { data: collLedger, error: collLedgerErr } = await collaborator.from("condominium_ledger_entries").select("id").eq("workspace_id", workspaceId);
  assert.ifError(collLedgerErr); assert.equal(collLedger.length, 0);
  const { error: collInsertErr } = await collaborator.from("condominium_ledger_entries").insert({
    workspace_id: workspaceId, condominium_id: condominiumId, entry_date: "2026-11-02",
    direction: "Uscita", category: "QA", description: marker, amount: 1, notes: marker
  });
  assert.ok(collInsertErr, "Collaborator unexpectedly inserted an accounting entry");
  record("APP-02 collaborator module boundary", true, "permitted condominium read; accounting read empty and insert denied");

  const { data: residentAccess, error: raErr } = await resident.from("portal_access").select("id,condominium_id").eq("user_id", userIds.resident).eq("active", true);
  assert.ifError(raErr); assert.ok(residentAccess.some(x => x.condominium_id === condominiumId));
  const { data: residentCondos, error: rcErr } = await resident.from("condominiums").select("id").eq("workspace_id", workspaceId);
  assert.ifError(rcErr); assert.ok(residentCondos.some(x => x.id === condominiumId));
  const { data: residentLedger, error: rlErr } = await resident.from("condominium_ledger_entries").select("id").eq("workspace_id", workspaceId);
  assert.ifError(rlErr); assert.equal(residentLedger.length, 0);
  const { error: residentDocInsertErr } = await resident.from("documents").insert({ workspace_id: workspaceId, condominium_id: condominiumId, title: marker, data: { publication: "Condiviso" } });
  assert.ok(residentDocInsertErr, "Resident unexpectedly created a document");
  record("APP-03 resident portal scope", true, "own portal/condominium visible; accounting empty; document creation denied");

  const foreignWorkspace = "00000000-0000-4000-8000-000000000001";
  const { data: crossRead, error: crossReadErr } = await collaborator.from("condominiums").select("id").eq("workspace_id", foreignWorkspace);
  assert.ifError(crossReadErr); assert.equal(crossRead.length, 0);
  const { error: crossWriteErr } = await collaborator.from("condominiums").insert({ workspace_id: foreignWorkspace, name: marker, data: { marker } });
  assert.ok(crossWriteErr, "Cross-workspace write unexpectedly succeeded");
  record("APP-04 cross-workspace isolation", true, "foreign workspace read empty; write rejected");

  const path = workspaceId + "/" + condominiumId + "/" + marker + ".txt";
  const bytes = new Blob(["BETHAG synthetic QA document " + marker], { type: "text/plain" });
  let objectCreated = false, documentId = null;
  try {
    const { error: uploadErr } = await collaborator.storage.from("bethag-documents").upload(path, bytes, { contentType: "text/plain", upsert: false });
    assert.ifError(uploadErr); objectCreated = true;
    const { data: doc, error: docErr } = await collaborator.from("documents").insert({
      workspace_id: workspaceId, condominium_id: condominiumId, title: marker,
      category: "QA", status: "Condiviso", file_path: path,
      data: { publication: "Condiviso", bethag_qa_marker: marker }
    }).select("id").single();
    assert.ifError(docErr); documentId = doc.id;
    const { data: residentDownload, error: residentDownloadErr } = await resident.storage.from("bethag-documents").download(path);
    assert.ifError(residentDownloadErr); assert.ok(residentDownload && residentDownload.size > 0);
    record("APP-13 shared document upload/download", true, "collaborator upload + metadata; resident downloaded shared bytes");
  } finally {
    if (documentId) await admin.from("documents").delete().eq("id", documentId).eq("workspace_id", workspaceId);
    if (objectCreated) await admin.storage.from("bethag-documents").remove([path]);
  }

  const { data: adminLedgerBefore, error: ledgerBeforeErr } = await admin.from("condominium_ledger_entries").select("id").eq("workspace_id", workspaceId).like("notes", marker);
  assert.ifError(ledgerBeforeErr); assert.equal(adminLedgerBefore.length, 0);
  record("QA fixture cleanup", true, "temporary document metadata and object removed; no marker ledger rows");
} catch (error) {
  console.error(JSON.stringify({ suite: "BETHAG_QA_AUTHENTICATED_RLS", status: "FAIL", results, error: String(error?.stack || error) }, null, 2));
  process.exitCode = 1;
} finally {
  for (const client of Object.values(clients)) await client.auth.signOut();
  if (collaborator) await collaborator.auth.signOut();
  if (temporaryCollaboratorId) {
    const membership = await fixtureAdmin.from("workspace_members").delete().eq("user_id", temporaryCollaboratorId);
    if (membership.error) throw membership.error;
    const user = await fixtureAdmin.auth.admin.deleteUser(temporaryCollaboratorId);
    if (user.error) throw user.error;
  }
}
console.log(JSON.stringify({ suite: "BETHAG_QA_AUTHENTICATED_RLS", target: "jhuyhlzzydcgghrzeexn", results }, null, 2));
if (results.some(x => x.status !== "PASS")) process.exitCode = 1;
