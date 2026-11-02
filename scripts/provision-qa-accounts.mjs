import { createClient } from "@supabase/supabase-js";

const URL = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const KEY = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
const marker = "BETHAG_QA_FIXTURE_20261102";
if (!KEY) throw new Error("Missing BETHAG_QA_SERVICE_ROLE_KEY");
if (!KEY.startsWith("eyJ")) throw new Error("Unexpected service-role key format");
const required = {
  admin: ["BETHAG_QA_ADMIN_PASSWORD", "bethag-admin-qa@example.com", "Amministratore QA", "admin"],
  collaborator: ["BETHAG_QA_COLLABORATOR_PASSWORD", "bethag-collaboratore-qa@example.com", "Collaboratore QA", "collaborator"],
  resident: ["BETHAG_QA_RESIDENT_PASSWORD", "bethag-condomino-qa@example.com", "Condomino QA", "resident"],
};
for (const [role, [secret]] of Object.entries(required)) {
  if (!process.env[secret]) throw new Error("Missing required password secret for " + role);
}
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const check = (result, label) => {
  if (result.error) throw new Error(label + ": " + result.error.message);
  return result.data;
};

async function getOrCreateUser(role, spec) {
  const [secret, email, fullName] = spec;
  let found = null;
  for (let page = 1; page <= 10 && !found; page++) {
    const data = check(await db.auth.admin.listUsers({ page, perPage: 100 }), "list auth users");
    found = data.users.find(u => u.email?.toLowerCase() === email);
    if (data.users.length < 100) break;
  }
  if (!found) {
    const created = check(await db.auth.admin.createUser({
      email, password: process.env[secret], email_confirm: true,
      user_metadata: { full_name: fullName, bethag_qa_fixture: marker, test_role: role }
    }), "create " + role);
    found = created.user;
  } else {
    check(await db.auth.admin.updateUserById(found.id, {
      password: process.env[secret], email_confirm: true,
      user_metadata: { ...(found.user_metadata ?? {}), full_name: fullName, bethag_qa_fixture: marker, test_role: role }
    }), "update " + role);
  }
  check(await db.from("profiles").upsert({
    id: found.id, full_name: fullName, email, role, active: true
  }, { onConflict: "id" }), "upsert profile " + role);
  return found;
}

const users = {};
for (const [role, spec] of Object.entries(required)) users[role] = await getOrCreateUser(role, spec);

// Reuse the uniquely marked fixture workspace; never touch unrelated QA data.
let workspace = check(await db.from("workspaces").select("id").eq("name", marker).maybeSingle(), "find QA workspace");
if (!workspace) workspace = check(await db.from("workspaces").insert({ name: marker, plan: "portal" }).select("id").single(), "create QA workspace");
const workspaceId = workspace.id;

let condominium = check(await db.from("condominiums").select("id").eq("workspace_id", workspaceId).eq("name", "Condominio QA BETHAG").maybeSingle(), "find QA condominium");
if (!condominium) condominium = check(await db.from("condominiums").insert({
  workspace_id: workspaceId, name: "Condominio QA BETHAG",
  address: "Via di Prova 1", city: "Imola", postal_code: "40026", province: "BO",
  data: { bethag_qa_fixture: marker }
}).select("id").single(), "create QA condominium");
const condominiumId = condominium.id;

const memberRows = [
  { workspace_id: workspaceId, user_id: users.admin.id, role: "admin", active: true, permissions: {} },
  { workspace_id: workspaceId, user_id: users.collaborator.id, role: "collaborator", active: true,
    permissions: { condomini: true, documenti: true, scadenze: true, assemblee: true, fornitori: true, attivita: true, comunicazioni: true, ai: false, portale: true } },
  { workspace_id: workspaceId, user_id: users.resident.id, role: "resident", active: true, condominium_id: condominiumId, permissions: {} }
];
for (const row of memberRows) check(await db.from("workspace_members").upsert(row, { onConflict: "workspace_id,user_id" }), "upsert workspace member " + row.role);

let unit = check(await db.from("condominium_units").select("id").eq("workspace_id", workspaceId).eq("condominium_id", condominiumId).eq("unit_code", "A-01").maybeSingle(), "find QA unit");
if (!unit) unit = check(await db.from("condominium_units").insert({
  workspace_id: workspaceId, condominium_id: condominiumId, unit_code: "A-01", building_code: "A",
  data: { unitType: "Abitazione", millesimi: "100", active: true, ownerMode: "condominium_member", ownerMemberIds: [], notes: "Unità sintetica per collaudo BETHAG" }
}).select("id").single(), "create QA unit");

let member = check(await db.from("condominium_members").select("id").eq("condominium_id", condominiumId).eq("email", required.resident[1]).maybeSingle(), "find QA resident member");
if (!member) member = check(await db.from("condominium_members").insert({
  condominium_id: condominiumId, user_id: users.resident.id, name: "Condomino QA",
  email: required.resident[1], role: "resident", active: true, unit_id: unit.id,
  permissions: {}, data: { firstName: "Condomino", lastName: "QA", role: "Proprietario", ownership_share: 1, current_owner: true, position_status: "Attivo" }
}).select("id").single(), "create QA resident member");

const portalQuery = await db.from("portal_access").select("id")
  .eq("workspace_id", workspaceId).eq("condominium_id", condominiumId)
  .ilike("email", required.resident[1]).maybeSingle();
const portalExisting = check(portalQuery, "find resident portal access");
const portalPayload = {
  workspace_id: workspaceId, condominium_id: condominiumId, name: "Condomino QA",
  email: required.resident[1], role: "resident", apartment: "A-01",
  permissions: ["documenti", "verbali", "regolamento", "pagamenti_ordinari", "assemblee", "comunicazioni"],
  active: true, user_id: users.resident.id, member_id: member.id,
  data: { bethag_qa_fixture: marker }
};
if (portalExisting) {
  check(await db.from("portal_access").update(portalPayload).eq("id", portalExisting.id), "update resident portal access");
} else {
  check(await db.from("portal_access").insert(portalPayload), "create resident portal access");
}

const summary = {
  target_project: "jhuyhlzzydcgghrzeexn",
  workspace_id: workspaceId, condominium_id: condominiumId, unit_id: unit.id,
  accounts: Object.fromEntries(Object.entries(users).map(([role, user]) => [role, { id: user.id, email: user.email }])),
  fixture: "created_or_reused",
  no_production_calls: true
};
console.log(JSON.stringify(summary, null, 2));
