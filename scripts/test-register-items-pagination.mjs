import assert from "node:assert/strict";
import { fetchRegisterItems } from "../src/lib/register-items-pagination.mjs";

function mockClient(pages) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [], orders: [], range: null };
      return {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        order(column, options) { call.orders.push([column, options]); return this; },
        range(from, to) {
          call.range = [from, to];
          calls.push(call);
          return Promise.resolve(pages[calls.length - 1] ?? { data: [], error: null });
        },
      };
    },
  };
}

const rows = Array.from({ length: 1001 }, (_, i) => ({ id: "id-" + i, title: "Item " + i, expiry_date: "2026-12-31", workspace_id: "ws" }));
const client = mockClient([{ data: rows.slice(0, 1000), error: null }, { data: rows.slice(1000), error: null }]);
const result = await fetchRegisterItems(client, "ws");
assert.equal(result.length, 1001);
assert.equal(result[1000].id, "id-1000");
assert.deepEqual(client.calls.map(call => call.range), [[0, 999], [1000, 1999]]);
for (const call of client.calls) {
  assert.equal(call.table, "condominium_register_items");
  assert.deepEqual(call.filters, [["workspace_id", "ws"]]);
  assert.deepEqual(call.orders.map(order => order[0]), ["expiry_date", "id"]);
}

const failure = mockClient([{ data: rows.slice(0, 1000), error: null }, { data: null, error: new Error("later page failed") }]);
await assert.rejects(() => fetchRegisterItems(failure, "ws"), /later page failed/);
assert.equal(failure.calls.length, 2, "A later page error must not return a partial register.");

const empty = mockClient([{ data: [], error: null }]);
assert.deepEqual(await fetchRegisterItems(empty, "ws"), []);
assert.equal(empty.calls.length, 1);
await assert.rejects(() => fetchRegisterItems(mockClient([]), "ws", 0), RangeError);

const source = await (await import("node:fs/promises")).readFile("src/RegisterPage.tsx", "utf8");
assert.match(source, /fetchRegisterItems\(supabase,workspaceId\)/, "RegisterPage must use the paginated register loader.");
console.log("PASS: register items hydration pagination and error propagation.");
