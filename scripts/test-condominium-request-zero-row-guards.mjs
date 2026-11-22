import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
function functionBody(name, nextName) {
  const start = source.indexOf(`export async function ${name}(`);
  const end = source.indexOf(`export async function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `${name} exists`);
  return source.slice(start, end);
}
const update = functionBody("updateCondominiumRequestStatus", "confirmCondominiumMemberTransfer");
const cancel = functionBody("cancelCondominiumCreationIntake", "confirmCondominiumInvoice");

for (const [name, body] of [["request status update", update], ["creation intake cancellation", cancel]]) {
  assert.match(body, /\.select\("id"\)/, `${name} returns affected row id`);
  assert.match(body, /if \(!?data\?\.id\)/, `${name} rejects zero-row writes`);
}
console.log("Condominium request zero-row update guards passed.");
