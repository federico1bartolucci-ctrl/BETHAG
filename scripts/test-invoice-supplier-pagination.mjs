import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadInvoiceSupplierRows, matchInvoiceSupplierRows } from "../src/lib/invoiceSupplierMatching.ts";

const backendSource = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = backendSource.indexOf("export async function confirmCondominiumInvoice");
const end = backendSource.indexOf("\nexport async function ", start + 1);
assert.ok(start >= 0 && end > start, "invoice confirmation function must exist");
const invoiceFunction = backendSource.slice(start, end);
assert.match(invoiceFunction, /loadInvoiceSupplierRows\(supabase, workspaceId, condominium\.id\)/, "invoice supplier lookup must use paginated query");
assert.match(invoiceFunction, /matchInvoiceSupplierRows\(supplierRows, supplierName, supplierVatNumber\)/, "invoice confirmation must use the extracted supplier matcher");
assert.doesNotMatch(invoiceFunction, /\.from\("suppliers"\)\s*\.select\("id,name,data,condominium_id"\)\s*\.eq\("workspace_id", workspaceId\)\s*\.or\(/, "invoice lookup must not query a single unpaginated supplier result");
assert.ok(packageJson.scripts.test.includes("test-invoice-supplier-pagination.mjs"), "regression test must run from npm test");

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], scope: null, orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        or(value) { state.scope = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `supplier-${index}`, name: `Vendor ${index}`, condominium_id: null, data: {},
}));
const secondPage = [
  { id: "supplier-late", name: "Azienda oltre limite", condominium_id: "condo-1", data: { vatNumber: "IT12345678901" } },
  { id: "supplier-other-condo", name: "Azienda altro condominio", condominium_id: "condo-2", data: { vatNumber: "IT99999999999" } },
];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const rows = await loadInvoiceSupplierRows(client, "workspace-1", "condo-1");
assert.equal(rows.length, 1002, "all scoped suppliers beyond the 1,000-row boundary must be loaded");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "supplier pages must advance");
assert.deepEqual(requests[0].filters, [["workspace_id", "workspace-1"]], "supplier query must stay workspace-scoped");
assert.equal(requests[0].scope, "condominium_id.eq.condo-1,condominium_id.is.null", "lookup must include only condo-specific and global suppliers");
assert.deepEqual(requests[0].orders, [["id", { ascending: true }]], "offset pagination must use stable ordering");

assert.equal(
  matchInvoiceSupplierRows(rows, "Azienda rilevata dall'OCR", "IT12345678901"),
  "supplier-late",
  "VAT matching must find a supplier on the second page",
);
assert.equal(
  matchInvoiceSupplierRows([{ id: "exact", name: "Acme Servizi", data: {} }], "ACME servizi", ""),
  "exact",
  "normalized exact-name fallback must remain available",
);
assert.equal(
  matchInvoiceSupplierRows([{ id: "contained", name: "Acme Servizi S.r.l.", data: {} }], "Acme Servizi", ""),
  "contained",
  "contained-name fallback must remain available",
);
assert.throws(
  () => matchInvoiceSupplierRows([{ id: "conflict", name: "Acme Servizi", data: { vatNumber: "IT00000000000" } }], "Acme Servizi", "IT12345678901"),
  /non coincide con quella del fornitore/,
  "exact-name VAT conflict must still be rejected",
);

const failing = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadInvoiceSupplierRows(failing.client, "workspace-1", "condo-1"),
  /page failed/,
  "a failed page must not silently return incomplete supplier data",
);
console.log("Invoice supplier pagination regression checks passed.");
