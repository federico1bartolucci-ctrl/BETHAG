import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { archiveTransferredMember } from "../src/lib/memberTransferCloseScope.mjs";

const outgoingA = { id: 51, condominiumId: 10, active: true, data: { current_owner: true, note: "A" } };
const unrelatedSameLegacyId = { id: 51, condominiumId: 20, active: true, data: { current_owner: true, note: "B" } };
const otherMember = { id: 52, condominiumId: 10, active: true, data: {} };
const source = [outgoingA, unrelatedSameLegacyId, otherMember];

const legacy = source.map((member) => Number(member.id) === 51
  ? { ...member, active: false, data: { ...(member.data ?? {}), current_owner: false } }
  : member);
assert.equal(legacy[1].active, false, "legacy ID-only update incorrectly archives the other condominium member");

const fixed = archiveTransferredMember(source, { memberId: 51, condominiumId: 10 });
assert.notStrictEqual(fixed, source);
assert.equal(fixed[0].active, false);
assert.equal(fixed[0].data.position_status, "Archiviato");
assert.equal(fixed[0].data.current_owner, false);
assert.equal(fixed[0].data.note, "A");
assert.strictEqual(fixed[1], unrelatedSameLegacyId);
assert.equal(fixed[1].active, true);
assert.equal(fixed[1].data.current_owner, true);
assert.strictEqual(fixed[2], otherMember);

assert.strictEqual(archiveTransferredMember(source, { memberId: 51 }), source);
assert.strictEqual(archiveTransferredMember(source, { memberId: 51, condominiumId: null }), source);
assert.strictEqual(archiveTransferredMember(source, { memberId: "bad", condominiumId: 10 }), source);
assert.strictEqual(archiveTransferredMember(source, { memberId: 999, condominiumId: 10 }), source);

const main = await readFile("src/main.tsx", "utf8");
const start = main.indexOf("const closeMemberTransferAccounting = async");
const end = main.indexOf("const saveCondominiumRequest", start);
assert.ok(start >= 0 && end > start, "member transfer close handler must exist");
const handler = main.slice(start, end);
assert.match(main, /import \{ archiveTransferredMember \} from "\.\/lib\/memberTransferCloseScope\.mjs";/);
assert.ok(handler.includes("memberId: Number(current.member?.id)"));
assert.ok(handler.includes("condominiumId: Number(current.member?.condominiumId)"));
assert.ok(handler.includes("archiveTransferredMember(members,"));
assert.ok(!handler.includes("Number(member.id) === legacyId"), "close handler must not archive by legacy ID alone");

const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal((pkg.scripts?.test ?? "").split("test-member-transfer-close-scope.mjs").length - 1, 1);
console.log("Member transfer close condominium-scope regression: PASS");
