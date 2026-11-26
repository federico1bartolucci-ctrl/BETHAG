import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { linkResidentMemberIfUnchanged } from "../supabase/functions/_shared/resident-invite-member-link.js";

const edgeSource = await readFile(
  new URL("../supabase/functions/bethag-invite-resident/index.ts", import.meta.url),
  "utf8",
);
assert.match(
  edgeSource,
  /import \{ linkResidentMemberIfUnchanged \} from "\.\.\/_shared\/resident-invite-member-link\.js"/,
  "the Edge Function must import the guarded member-link operation",
);
assert.match(
  edgeSource,
  /await linkResidentMemberIfUnchanged\(adminClient, member, targetUserId\)/,
  "the Edge Function must use the guarded operation before portal_access upsert",
);
assert.match(
  edgeSource,
  /if \(!linkedMember\?\.length\)[\s\S]*?invitationSent: invited/,
  "a stale snapshot must follow the existing zero-row conflict response",
);

const linkIndex = edgeSource.indexOf("await linkResidentMemberIfUnchanged(adminClient, member, targetUserId)");
const conflictIndex = edgeSource.indexOf("if (!linkedMember?.length)", linkIndex);
const profileLookupIndex = edgeSource.indexOf('.from("profiles")', linkIndex);
const profileUpsertIndex = edgeSource.indexOf('.upsert(', profileLookupIndex);
const portalUpsertIndex = edgeSource.indexOf('.from("portal_access")', profileUpsertIndex);
assert.ok(linkIndex >= 0 && conflictIndex > linkIndex, "member snapshot must be checked first");
assert.ok(profileLookupIndex > conflictIndex, "stale snapshots must not read or write the profile");
assert.ok(profileUpsertIndex > profileLookupIndex, "profile upsert must follow the successful member link");
assert.ok(portalUpsertIndex > profileUpsertIndex, "portal access must follow the profile upsert");


const snapshot = {
  id: "member-1",
  condominium_id: "condo-1",
  legacy_id: 17,
  user_id: null,
  name: "Mario Rossi",
  email: "mario@example.test",
  active: true,
  unit_id: "unit-a",
  data: {
    role: "Proprietario",
    apartment: "A1",
    unitCode: "A",
  },
};

function readField(row, column) {
  if (column.startsWith("data->>")) {
    const value = row.data?.[column.slice("data->>".length)];
    return value === undefined || value === null ? null : String(value);
  }
  const value = row[column];
  return value === undefined ? null : value;
}

function createMockAdminClient(currentRow) {
  const filters = [];
  const payloads = [];
  const builder = {
    eq(column, value) {
      filters.push({ kind: "eq", column, value });
      return this;
    },
    is(column, value) {
      filters.push({ kind: "is", column, value });
      return this;
    },
    async select() {
      const matches = filters.every((filter) => {
        const actual = readField(currentRow, filter.column);
        return filter.kind === "eq"
          ? Object.is(actual, filter.value)
          : actual === null;
      });
      if (matches) Object.assign(currentRow, payloads[payloads.length - 1]);
      return { data: matches ? [{ id: currentRow.id }] : [], error: null };
    },
  };
  return {
    filters,
    from(table) {
      assert.equal(table, "condominium_members");
      return {
        update(payload) {
          payloads.push(payload);
          return builder;
        },
      };
    },
  };
}

async function expectStaleSnapshotRejected(label, mutateCurrent) {
  const current = structuredClone(snapshot);
  mutateCurrent(current);
  const client = createMockAdminClient(current);
  const rows = await linkResidentMemberIfUnchanged(client, structuredClone(snapshot), "auth-user-new");
  assert.deepEqual(rows, [], label + " must not link an Auth user using stale resident data");
  assert.notEqual(current.user_id, "auth-user-new", label + " must not overwrite the current resident link");
  console.log("PASS stale snapshot rejected: " + label);
}

{
  const current = structuredClone(snapshot);
  const client = createMockAdminClient(current);
  const rows = await linkResidentMemberIfUnchanged(client, structuredClone(snapshot), "auth-user-new");
  assert.deepEqual(rows, [{ id: "member-1" }]);
  assert.equal(current.user_id, "auth-user-new");
  assert.ok(client.filters.some((f) => f.kind === "is" && f.column === "user_id" && f.value === null));
  for (const column of ["email", "name", "unit_id", "data->>role", "data->>apartment", "data->>unitCode"]) {
    assert.ok(client.filters.some((f) => f.column === column), "missing snapshot predicate: " + column);
  }
  console.log("PASS unchanged resident snapshot links the intended Auth user");
}

await expectStaleSnapshotRejected("email changed", (row) => { row.email = "new@example.test"; });
await expectStaleSnapshotRejected("qualification changed", (row) => { row.data.role = "Inquilino"; });
await expectStaleSnapshotRejected("unit changed", (row) => { row.unit_id = "unit-b"; });
await expectStaleSnapshotRejected("resident deactivated", (row) => { row.active = false; });
await expectStaleSnapshotRejected("display name changed", (row) => { row.name = "Mario Nuovo"; });
await expectStaleSnapshotRejected("portal apartment changed", (row) => { row.data.apartment = "A2"; });
await expectStaleSnapshotRejected("another request linked the member first", (row) => { row.user_id = "auth-user-other"; });

{
  const existing = structuredClone(snapshot);
  existing.user_id = "auth-user-existing";
  const current = structuredClone(existing);
  const client = createMockAdminClient(current);
  const rows = await linkResidentMemberIfUnchanged(client, existing, "auth-user-existing");
  assert.deepEqual(rows, [{ id: "member-1" }]);
  assert.ok(client.filters.some((f) => f.kind === "eq" && f.column === "user_id" && f.value === "auth-user-existing"));
  console.log("PASS already-linked member requires the same existing Auth user");
}

console.log("Resident invitation stale-snapshot runtime regression: PASS");
