import assert from "node:assert/strict";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

const special = 'Bianchi, S.p.A. (Roma) "Quote" \\ Branch';
const rows = [
  { id: "supplier-1", workspace_id: "ws-1", business_name: "Azienda Alfa" },
  { id: "supplier-2", workspace_id: "ws-1", business_name: special },
  { id: "supplier-3", workspace_id: "ws-1", business_name: "Casa" },
  { id: "supplier-4", workspace_id: "ws-1", business_name: "Ditta" },
  { id: "supplier-5", workspace_id: "ws-1", business_name: null },
  { id: "supplier-6", workspace_id: "ws-1", business_name: null },
  { id: "foreign-1", workspace_id: "ws-2", business_name: "Zeta" },
];
const requests = [];
let pageNumber = 0;
const expectedSpecialFilter = 'business_name.gt."Bianchi, S.p.A. (Roma) \\"Quote\\" \\\\ Branch",and(business_name.eq."Bianchi, S.p.A. (Roma) \\"Quote\\" \\\\ Branch",id.gt.supplier-2),business_name.is.null';
const legacyDateCursorPattern = /^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-]+(?:Z|z)?)?$/;
assert.throws(() => { if (!legacyDateCursorPattern.test(special)) throw new Error("Valore cursor workspace non valido."); }, /Valore cursor workspace non valido/);
const expectedDittaFilter = 'business_name.gt."Ditta",and(business_name.eq."Ditta",id.gt.supplier-4),business_name.is.null';
const client = {
  from(table) {
    const state = { table, workspaceId: null, orders: [], cursorFilter: null, nullCursor: false, idGt: null };
    const query = {
      select() { return query; },
      eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
      order(column, options) { state.orders.push([column, options]); return query; },
      or(filter) { state.cursorFilter = filter; return query; },
      is(column, value) { if (column === "business_name" && value === null) state.nullCursor = true; return query; },
      gt(column, value) { if (column === "id") state.idGt = value; return query; },
      range(from, to) {
        pageNumber += 1;
        requests.push({ ...state, orders: state.orders.slice(), from, to });
        if (pageNumber === 2) assert.equal(state.cursorFilter, expectedSpecialFilter);
        if (pageNumber === 3) assert.equal(state.cursorFilter, expectedDittaFilter);
        if (pageNumber === 4) { assert.equal(state.nullCursor, true); assert.equal(state.idGt, "supplier-6"); }
        const scoped = rows.filter(row => row.workspace_id === state.workspaceId);
        return Promise.resolve({ data: pageNumber <= 3 ? scoped.slice((pageNumber - 1) * 2, pageNumber * 2) : [], error: null });
      },
    };
    return query;
  },
};
const result = await loadWorkspacePaginatedRows(client, "condominium_suppliers", "ws-1", { orderBy: "business_name", pageSize: 2 });
assert.deepEqual(result.data.map(row => row.id), ["supplier-1", "supplier-2", "supplier-3", "supplier-4", "supplier-5", "supplier-6"]);
assert.equal(result.data.length, 6);
assert.equal(new Set(result.data.map(row => row.id)).size, 6);
assert.equal(requests.length, 4);
assert.ok(requests.every(row => row.workspaceId === "ws-1"));
console.log("Text cursor pagination runtime regression: PASS (quoted reserved characters, escaped quote/backslash, NULL tail, workspace scope)");
