import assert from "node:assert/strict";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

function makeClient(rows) {
  const requests = [];
  return {
    requests,
    client: {
      from(table) {
        const state = { table, filters: [], orders: [], cursorFilter: null, nullCursor: false, idGt: null };
        const query = {
          select(columns) { state.select = columns; return query; },
          eq(column, value) { state.filters.push([column, value]); return query; },
          order(column, options) { state.orders.push([column, options]); return query; },
          or(filter) { state.cursorFilter = filter; return query; },
          is(column, value) { if (column === state.orders[0]?.[0] && value === null) state.nullCursor = true; return query; },
          gt(column, value) { if (column === "id") state.idGt = value; return query; },
          range(from, to) {
            const orderBy = state.orders[0]?.[0] ?? "created_at";
            let filtered = rows.filter(row => state.filters.every(([column, value]) => row[column] === value));
            if (state.cursorFilter) {
              const cursorId = state.cursorFilter.match(/id\.gt\.([^),]+)/)?.[1];
              const cursorValue = state.cursorFilter.match(new RegExp(`${orderBy}\\.eq\\.([^,]+)`))?.[1];
              assert.ok(cursorId && cursorValue, "cursor should include order value and ID tie-break");
              filtered = filtered.filter(row => row[orderBy] === null || String(row[orderBy]) > cursorValue || (String(row[orderBy]) === cursorValue && String(row.id) > cursorId));
            } else if (state.nullCursor) {
              filtered = filtered.filter(row => row[orderBy] === null && String(row.id) > String(state.idGt));
            }
            filtered.sort((a, b) => {
              const av = a[orderBy], bv = b[orderBy];
              if (av === null && bv !== null) return 1;
              if (av !== null && bv === null) return -1;
              const compare = String(av ?? "").localeCompare(String(bv ?? ""));
              return compare || String(a.id).localeCompare(String(b.id));
            });
            requests.push({ table, filters: state.filters.slice(), orderBy, from, to });
            return Promise.resolve({ data: filtered.slice(from, to + 1), error: null });
          },
        };
        return query;
      },
    },
  };
}

const workspace = "workspace-1";
const work = "work-current";
const legacyRows = [{ id: "doclink-other", workspace_id: workspace, work_id: "work-other", created_at: "2026-01-01", document_id: 5 }];
const legacyClient = makeClient(legacyRows);
const unfiltered = await loadWorkspacePaginatedRows(legacyClient.client, "condominium_work_documents", workspace);
assert.ok(unfiltered.data.length > 0, "legacy workspace-only query falsely finds another work’s documents");
const correctlyScoped = await loadWorkspacePaginatedRows(legacyClient.client, "condominium_work_documents", workspace, { filters: { work_id: work }, select: "id,created_at" });
assert.equal(correctlyScoped.data.length, 0, "work without links must remain documentless even if another work has links");
assert.ok(legacyClient.requests.at(-1).filters.some(([column, value]) => column === "work_id" && value === work), "work_id filter must be applied to query");

const manyRows = [
  ...Array.from({ length: 1001 }, (_, i) => ({ id: `link-${String(i).padStart(4, "0")}`, workspace_id: workspace, work_id: work, created_at: "2026-01-01", document_id: i })),
  { id: "link-other-1", workspace_id: workspace, work_id: "work-other", created_at: "2026-01-01", document_id: 9001 },
  { id: "link-other-2", workspace_id: workspace, work_id: "work-other", created_at: "2026-01-02", document_id: 9002 },
  { id: "link-foreign", workspace_id: "workspace-2", work_id: work, created_at: "2026-01-03", document_id: 9003 },
];
const pagedClient = makeClient(manyRows);
const result = await loadWorkspacePaginatedRows(pagedClient.client, "condominium_work_documents", workspace, { filters: { work_id: work }, select: "id,created_at", pageSize: 1000 });
assert.equal(result.data.length, 1001, "all links for the selected work must be recovered over multiple pages");
assert.ok(result.data.every(row => row.work_id === work), "no other work’s links may be included");
assert.equal(new Set(result.data.map(row => row.id)).size, 1001, "pagination must not duplicate links");
assert.deepEqual(pagedClient.requests.map(r => [r.from, r.to]), [[0, 999], [0, 999]], "filtered work documents must paginate");
assert.ok(pagedClient.requests.every(r => r.filters.some(([column, value]) => column === "work_id" && value === work)), "work filter must persist across every page");
await assert.rejects(loadWorkspacePaginatedRows(pagedClient.client, "condominium_work_documents", workspace, { filters: { work_id: null } }), /Valore filtro workspace non valido/);
console.log("Register closure documents runtime regression: PASS (wrong-work false-positive rejected; 1,001 scoped links paginated; filter validated)");
