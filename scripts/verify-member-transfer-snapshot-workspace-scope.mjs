import fs from "node:fs";

const source = fs.readFileSync("src/lib/bethagBackend.ts", "utf8");
const start = source.indexOf("export async function getMemberTransferAccountingSnapshot(");
const end = source.indexOf("export async function closeCondominiumMemberTransfer(", start);
if (start < 0 || end < 0) throw new Error("Member transfer snapshot function not found.");
const fn = source.slice(start, end);

for (const expected of [
  'if (!workspaceId) throw new Error("Workspace non disponibile.");',
  '.select("id, condominium_id, condominiums!inner(workspace_id)")',
  '.eq("condominiums.workspace_id", workspaceId)',
  '.eq("legacy_id", outgoingMemberLegacyId)',
  '.eq("condominium_id", member.condominium_id)',
]) {
  if (!fn.includes(expected)) throw new Error(`Missing workspace/condominium scope guard: ${expected}`);
}
console.log("Member-transfer accounting snapshot workspace/condominium scope guard passed.");
