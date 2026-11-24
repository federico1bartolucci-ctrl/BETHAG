import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

const calls = [];
const pages = [
  [
    { id: "row-1", created_at: "2026-01-01T00:00:00Z", status: "open" },
    { id: "row-2", created_at: "2026-01-02T00:00:00Z", status: "open" },
  ],
  [{ id: "row-3", created_at: "2026-01-03T00:00:00Z", status: "open" }],
];
let pageIndex = 0;
const client = {
  from(table) {
    calls.push({ table });
    const query = {
      select(value) { calls.push(["select", value]); return this; },
      eq(column, value) { calls.push(["eq", column, value]); return this; },
      order(column, options) { calls.push(["order", column, options]); return this; },
      or(value) { calls.push(["or", value]); return this; },
      is(column, value) { calls.push(["is", column, value]); return this; },
      gt(column, value) { calls.push(["gt", column, value]); return this; },
      range(start, end) {
        calls.push(["range", start, end]);
        const data = pages[pageIndex++] ?? [];
        return Promise.resolve({ data, error: null });
      },
    };
    return query;
  },
};

const result = await loadWorkspacePaginatedRows(client, "condominium_register_items", "workspace-1", {
  pageSize: 2,
  orderBy: "created_at",
  filters: { status: "open" },
});
assert.deepEqual(result.data.map((row) => row.id), ["row-1", "row-2", "row-3"]);
assert.equal(result.error, null);
assert.equal(pageIndex, 2);
assert(calls.some((entry) => Array.isArray(entry) && entry[0] === "eq" && entry[1] === "workspace_id" && entry[2] === "workspace-1"));
assert(calls.some((entry) => Array.isArray(entry) && entry[0] === "eq" && entry[1] === "status" && entry[2] === "open"));
assert(calls.some((entry) => Array.isArray(entry) && entry[0] === "or" && entry[1].includes("created_at.gt.2026-01-02T00:00:00Z")));
assert(calls.filter((entry) => Array.isArray(entry) && entry[0] === "range").length === 2);

// A backend error on a later page must reject instead of returning partial data.
const backendFailure = {
  from() {
    return {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      or() { return this; },
      range() { return Promise.resolve({ data: null, error: new Error("page two failed") }); },
    };
  },
};
await assert.rejects(
  () => loadWorkspacePaginatedRows(backendFailure, "items", "workspace-1"),
  /page two failed/,
);

await assert.rejects(
  () => loadWorkspacePaginatedRows(client, "items", "workspace-1", { filters: { "status;drop": "open" } }),
  /Colonna di ordinamento non valida/,
);
await assert.rejects(
  () => loadWorkspacePaginatedRows(client, "items", "workspace-1", { filters: { workspace_id: "other" } }),
  /Filtro workspace duplicato/,
);
await assert.rejects(
  () => loadWorkspacePaginatedRows(client, "items", "workspace-1", { pageSize: 1001 }),
  /Dimensione pagina non valida/,
);

// Guard the six RegisterPage data sources so future edits cannot silently bypass pagination.
const registerPage = readFileSync(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const expectedSources = [
  ["condominium_register_items", "expiry_date"],
  ["condominium_suppliers", "business_name"],
  ["condominium_works", "start_date"],
  ["documents", "created_at"],
  ["condominium_funds", "name"],
  ["condominium_work_progress", "progress_date"],
];
for (const [table, orderBy] of expectedSources) {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    "loadWorkspacePaginatedRows\\(supabase,\\s*\"" + escapedTable +
    "\",\\s*workspaceId,\\s*\\{\\s*orderBy:\\s*\"" + orderBy + "\"",
  );
  assert.match(registerPage, pattern, `RegisterPage must paginate ${table} ordered by ${orderBy}`);
}

console.log("CAP workspace pagination regression and RegisterPage wiring: PASS");
