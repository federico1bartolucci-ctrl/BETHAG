import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadActiveAdminMemberships, ADMIN_MEMBERSHIP_PAGE_SIZE } from "../supabase/functions/delete-account/admin-membership-pagination.mjs";

function mockClient(rows, { failAfterCursor = null, malformedResponse = null } = {}) {
  const calls = [];
  const client = {
    from(table) {
      const state = { table, filters: [], orders: [], pageSize: null, cursor: null };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        limit(value) { state.pageSize = value; return query; },
        gt(column, value) { state.cursor = [column, value]; return query; },
        then(resolve, reject) {
          calls.push({ ...state, filters: [...state.filters], orders: [...state.orders] });
          const cursorValue = state.cursor?.[1] ?? null;
          if (malformedResponse === "non-array" && cursorValue === null) {
            return Promise.resolve({ data: { workspace_id: "workspace-0000" }, error: null }).then(resolve, reject);
          }
          if (failAfterCursor !== null && cursorValue === failAfterCursor) {
            return Promise.resolve({ data: null, error: new Error("second-page failure") }).then(resolve, reject);
          }
          let filtered = rows.filter(row => state.filters.every(([column, value]) => row[column] === value));
          if (cursorValue !== null) filtered = filtered.filter(row => row.workspace_id > cursorValue);
          filtered.sort((a, b) => a.workspace_id.localeCompare(b.workspace_id));
          let page = filtered.slice(0, state.pageSize);
          if (malformedResponse === "missing-workspace-id" && cursorValue === null && page.length) {
            page[0] = { ...page[0], workspace_id: "" };
          }
          if (malformedResponse === "oversized" && cursorValue === null && filtered.length > state.pageSize) {
            page.push(filtered[state.pageSize]);
          }
          if (malformedResponse === "out-of-order" && cursorValue === null && page.length > 1) page.reverse();
          return Promise.resolve({ data: page, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

const rows = Array.from({ length: 1001 }, (_, i) => ({
  workspace_id: `workspace-${String(i).padStart(4, "0")}`,
  user_id: "user-1", role: "admin", active: true,
}));
assert.equal(rows.slice(0, 1000).some(row => row.workspace_id === "workspace-1000"), false);

const { client, calls } = mockClient(rows);
const result = await loadActiveAdminMemberships(client, " user-1 ");
assert.equal(result.error, null);
assert.equal(result.data.length, 1001);
assert.equal(result.data.some(row => row.workspace_id === "workspace-1000"), true);
assert.equal(calls.length, 2);
assert.deepEqual(calls.map(call => call.pageSize), [ADMIN_MEMBERSHIP_PAGE_SIZE, ADMIN_MEMBERSHIP_PAGE_SIZE]);
assert.deepEqual(calls.map(call => call.cursor), [null, ["workspace_id", "workspace-0999"]]);
for (const call of calls) {
  assert.equal(call.table, "workspace_members");
  assert.deepEqual(call.filters, [["user_id", "user-1"], ["role", "admin"], ["active", true]]);
  assert.deepEqual(call.orders, [["workspace_id", { ascending: true }]]);
}

const failed = mockClient(rows, { failAfterCursor: "workspace-0999" });
const failedResult = await loadActiveAdminMemberships(failed.client, "user-1");
assert.equal(failedResult.data, null);
assert.match(failedResult.error.message, /second-page failure/);
assert.equal(failed.calls.length, 2);

const missingUser = mockClient(rows);
assert.deepEqual(await loadActiveAdminMemberships(missingUser.client, ""), { data: [], error: null });
assert.equal(missingUser.calls.length, 0);

for (const malformedResponse of ["non-array", "missing-workspace-id", "oversized", "out-of-order"]) {
  const malformed = mockClient(rows, { malformedResponse });
  const malformedResult = await loadActiveAdminMemberships(malformed.client, "user-1");
  assert.equal(malformedResult.data, null, `${malformedResponse} page must fail closed`);
  assert.match(malformedResult.error.message, /invalid page/i, `${malformedResponse} must report a validation error`);
  assert.equal(malformed.calls.length, 1, `${malformedResponse} must abort before reading another page`);
}

const edgeFunction = await readFile(new URL("../supabase/functions/delete-account/index.ts", import.meta.url), "utf8");
assert.match(edgeFunction, /loadActiveAdminMemberships\(ctx\.supabase,\s*userId\)/);
assert.doesNotMatch(edgeFunction, /\.from\("workspace_members"\)\s*\.select\("workspace_id"\)\s*\.eq\("user_id",\s*userId\)\s*\.eq\("role",\s*"admin"\)\s*\.eq\("active",\s*true\)/);
const errorGate = edgeFunction.indexOf("if (adminMembershipsError)");
const deleteUserCall = edgeFunction.indexOf("ctx.supabaseAdmin.auth.admin.deleteUser(userId, false)");
assert.ok(errorGate >= 0 && deleteUserCall > errorGate, "membership validation errors must be checked before account deletion");

console.log("Active admin membership pagination runtime regression passed: 1,001 workspaces recovered; later-page failures and malformed pages fail-closed; delete-account wiring verified.");
