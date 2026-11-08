import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminPassword = process.env.BETHAG_QA_ADMIN_PASSWORD;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key && adminPassword && serviceKey, "Missing QA credentials for Edge Functions phase 1");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await admin.auth.signInWithPassword({
  email: "bethag-admin-qa@example.com",
  password: adminPassword,
});
assert.ifError(login.error);
assert.ok(login.data.session?.access_token, "QA admin session missing");

const workspaceResult = await admin.from("workspaces")
  .select("id")
  .eq("name", "BETHAG_QA_FIXTURE_20261102")
  .single();
assert.ifError(workspaceResult.error);
const workspaceId = workspaceResult.data.id;
const marker = "BETHAG_QA_PHASE1_AI_" + Date.now();
const filename = marker + ".pdf";
const storagePath = workspaceId + "/" + filename;

function makePdf() {
  const text = [
    "BETHAG QA PHASE 1 TEST DOCUMENT",
    "Condominio QA Fase Uno",
    "Indirizzo: Via Test 1, Bologna",
    "Unita: Interno 1",
    "Proprietario: Mario Rossi",
    "Millesimi: 1000",
    "Fattura di prova numero QA-001, importo 120,00 EUR, data 08/11/2026",
  ];
  const escapePdf = (value) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const commands = ["BT", "/F1 12 Tf", "72 760 Td"];
  text.forEach((line, index) => {
    if (index) commands.push("0 -22 Td");
    commands.push("(" + escapePdf(line) + ") Tj");
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + Buffer.byteLength(stream) + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return Buffer.from(pdf, "ascii");
}

async function invoke(slug, body) {
  const response = await fetch(url + "/functions/v1/" + slug, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + login.data.session.access_token,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, slug + " returned HTTP " + response.status + ": " + JSON.stringify(payload));
  return payload;
}

let uploaded = false;
try {
  const upload = await service.storage.from("bethag-documents").upload(storagePath, makePdf(), {
    contentType: "application/pdf",
    upsert: false,
  });
  assert.ifError(upload.error);
  uploaded = true;

  const file = { filename, storagePath, mimeType: "application/pdf" };
  const condominium = await invoke("bethag-ai-condominium", { workspaceId, files: [file] });
  assert.ok(condominium.draft && Array.isArray(condominium.draft.unitRecords), "AI condominium draft schema missing");
  assert.ok(Array.isArray(condominium.draft.warnings), "AI condominium warnings missing");
  console.log("PASS: bethag-ai-condominium authenticated QA file-to-structured-draft");

  const document = await invoke("bethag-ai-document", { workspaceId, files: [file] });
  assert.ok(document.draft && typeof document.draft.documentType === "string", "AI document draft schema missing");
  assert.ok(Array.isArray(document.draft.unitRows), "AI document unitRows missing");
  assert.ok(Array.isArray(document.draft.warnings), "AI document warnings missing");
  console.log("PASS: bethag-ai-document authenticated QA file-to-structured-draft");

  console.log("PASS: both AI Edge Functions completed with the configured OpenAI API key and model");
} finally {
  if (uploaded) {
    const removed = await service.storage.from("bethag-documents").remove([storagePath]);
    assert.ifError(removed.error);
  }
  await admin.auth.signOut();
}
