import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadCondominiumWorkReconciliationRows } from "../src/lib/workReconciliationPagination.mjs";

const DEFAULT_LIMIT = 1000;
function createMockClient(rowsByTable, { failTable = null, failPage = null } = {}) {
  const calls = [];
  const requestCounts = new Map();
  const client = {
    from(table) {
      const state = { table, columns: null, eqFilters: [], inFilters: [], orders: [], cursor: null, range: null };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.eqFilters.push([column, value]); return query; },
        in(column, values) { state.inFilters.push([column, values.slice()]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        gt(column, value) { state.cursor = [column, value]; return query; },
        range(from, to) { state.range = [from, to]; state.pageNumber = (requestCounts.get(table) ?? 0) + 1; requestCounts.set(table, state.pageNumber); calls.push({ ...state, eqFilters: state.eqFilters.slice(), inFilters: state.inFilters.slice(), orders: state.orders.slice() }); return query; },
        then(resolve, reject) {
          let filtered = (rowsByTable[table] ?? []).filter((row) =>
            state.eqFilters.every(([column, value]) => row[column] === value) &&
            state.inFilters.every(([column, values]) => values.includes(row[column])) &&
            (!state.cursor || String(row[state.cursor[0]]) > String(state.cursor[1]))
          );
          filtered = filtered.slice().sort((a, b) => {
            for (const [column, options] of state.orders) {
              const av = a[column], bv = b[column];
              if (av === bv) continue;
              const compare = String(av ?? "").localeCompare(String(bv ?? ""));
              return options?.ascending === false ? -compare : compare;
            }
            return 0;
          });
          const [from, to] = state.range ?? [0, DEFAULT_LIMIT - 1];
          const page = filtered.slice(from, to + 1);
          const error = state.range && table === failTable && state.pageNumber === failPage
            ? new Error("simulated later-page failure")
            : null;
          return Promise.resolve({ data: error ? null : page, error }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

function id(prefix, index) { return prefix + String(index).padStart(4, "0"); }
const workspaceId = "workspace-1";
const condominiumId = "condominium-1";
const workId = "work-1";

const ledgerRows = Array.from({ length: 1001 }, (_, i) => ({
  id: id("ledger-", i), workspace_id: workspaceId, condominium_id: condominiumId, direction: "Uscita",
  amount: 1, payment_status: "Pagato", description: "Test", data: {}, document_id: null,
}));
ledgerRows.push({ id: "ledger-foreign-0001", workspace_id: "workspace-2", condominium_id: condominiumId, direction: "Uscita", amount: 99, document_id: null });
ledgerRows.push({ id: "ledger-other-condo-0001", workspace_id: workspaceId, condominium_id: "condominium-2", direction: "Uscita", amount: 99, document_id: null });
ledgerRows.push({ id: "ledger-incoming-0001", workspace_id: workspaceId, condominium_id: condominiumId, direction: "Entrata", amount: 99, document_id: null });

// Reproduce the unpaginated baseline: PostgREST returns only the first 1,000 matching rows.
{
  const { client } = createMockClient({ condominium_ledger_entries: ledgerRows });
  const { data: legacyLedger } = await client.from("condominium_ledger_entries")
    .select("id,amount,payment_status,description,data,document_id")
    .eq("workspace_id", workspaceId).eq("condominium_id", condominiumId).eq("direction", "Uscita");
  assert.equal(legacyLedger.length, 1000);
  assert.equal(legacyLedger.some((row) => row.id === id("ledger-", 1000)), false);
}

// The paginated read recovers all 1,001 ledger entries while preserving all three scopes.
{
  const { client, calls } = createMockClient({ condominium_ledger_entries: ledgerRows });
  const ledger = await loadCondominiumWorkReconciliationRows(client, "condominium_ledger_entries", workspaceId, {
    condominiumId, direction: "Uscita", select: "id,amount,payment_status,description,data,document_id", pageSize: 200,
  });
  assert.equal(ledger.length, 1001);
  assert.equal(ledger.reduce((sum, row) => sum + row.amount, 0), 1001);
  assert.equal(new Set(ledger.map((row) => row.id)).size, 1001);
  assert.equal(ledger.at(-1).id, id("ledger-", 1000));
  assert.deepEqual(calls.map((call) => call.range), Array.from({ length: 6 }, () => [0, 199]));
  assert.ok(calls.every((call) => call.eqFilters.some(([column, value]) => column === "workspace_id" && value === workspaceId) && call.eqFilters.some(([column, value]) => column === "condominium_id" && value === condominiumId) && call.eqFilters.some(([column, value]) => column === "direction" && value === "Uscita")));
  assert.ok(calls.every((call) => call.cursor === null || call.cursor[0] === "id"));
}

// SAL rows also exceed the response cap and must not be truncated before summation.
{
  const progressRows = Array.from({ length: 1001 }, (_, i) => ({
    id: id("progress-", i), workspace_id: workspaceId, work_id: workId, progress_no: 1001 - i,
    title: "SAL", amount: 2, paid_amount: 0, ledger_entry_id: null,
  }));
  progressRows.push({ id: "progress-other-work", workspace_id: workspaceId, work_id: "work-2", progress_no: 1, amount: 500, paid_amount: 0 });
  const { client } = createMockClient({ condominium_work_progress: progressRows });
  const { data: legacyProgress } = await client.from("condominium_work_progress")
    .select("progress_no,title,amount,paid_amount,ledger_entry_id").eq("workspace_id", workspaceId).eq("work_id", workId);
  assert.equal(legacyProgress.length, 1000);
  const fixed = await loadCondominiumWorkReconciliationRows(client, "condominium_work_progress", workspaceId, {
    workId, select: "id,progress_no,title,amount,paid_amount,ledger_entry_id", pageSize: 200,
  });
  assert.equal(fixed.length, 1001);
  assert.equal(fixed.reduce((sum, row) => sum + row.amount, 0), 2002);
  const ordered = fixed.sort((a, b) => Number(a.progress_no) - Number(b.progress_no) || String(a.id).localeCompare(String(b.id)));
  assert.equal(ordered[0].progress_no, 1);
  assert.equal(ordered.at(-1).progress_no, 1001);
}

// Work-document links are paginated; document-ID IN filters are chunked to avoid oversized requests.
{
  const links = Array.from({ length: 1001 }, (_, i) => ({ id: id("link-", i), workspace_id: workspaceId, work_id: workId, document_id: i + 1, title: "Doc" }));
  const { client } = createMockClient({ condominium_work_documents: links });
  const legacy = await client.from("condominium_work_documents").select("id,document_id,title").eq("workspace_id", workspaceId).eq("work_id", workId);
  assert.equal(legacy.data.length, 1000);
  const fixed = await loadCondominiumWorkReconciliationRows(client, "condominium_work_documents", workspaceId, {
    workId, select: "id,document_id,title", pageSize: 200,
  });
  assert.equal(fixed.length, 1001);
  assert.equal(fixed.at(-1).document_id, 1001);
}

// Documents are fetched in bounded legacy-ID batches and all pages are recovered.
{
  const docs = Array.from({ length: 1001 }, (_, i) => ({ id: id("doc-", i), workspace_id: workspaceId, legacy_id: i + 1, title: "Invoice", category: "Fattura", data: {} }));
  docs.push({ id: "doc-foreign", workspace_id: "workspace-2", legacy_id: 1001, title: "Invoice", category: "Fattura", data: {} });
  const { client, calls } = createMockClient({ documents: docs });
  const legacyIds = Array.from({ length: 1001 }, (_, i) => i + 1);
  const fixed = await loadCondominiumWorkReconciliationRows(client, "documents", workspaceId, {
    legacyIds, select: "id,legacy_id,title,category,data", pageSize: 200, legacyIdBatchSize: 500,
  });
  assert.equal(fixed.length, 1001);
  assert.equal(new Set(fixed.map((row) => row.legacy_id)).size, 1001);
  assert.ok(calls.filter((call) => call.table === "documents").length >= 7);
  assert.ok(calls.every((call) => call.eqFilters.some(([column, value]) => column === "workspace_id" && value === workspaceId)));
  assert.ok(calls.every((call) => call.inFilters.every(([column, values]) => column === "legacy_id" && values.length <= 500)));
}

// A later-page failure must abort instead of returning a truncated reconciliation result.
{
  const { client, calls } = createMockClient({ condominium_work_progress: Array.from({ length: 1001 }, (_, i) => ({ id: id("progress-", i), workspace_id: workspaceId, work_id: workId, progress_no: i + 1, amount: 1 })) }, { failTable: "condominium_work_progress", failPage: 2 });
  await assert.rejects(loadCondominiumWorkReconciliationRows(client, "condominium_work_progress", workspaceId, { workId, pageSize: 200 }), /simulated later-page failure/);
  assert.equal(calls.filter((call) => call.table === "condominium_work_progress").length, 2);
}

// Production wiring and npm test coverage are required, not just helper tests.
{
  const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(backend, /import\s*\{\s*loadCondominiumWorkReconciliationRows\s*\}\s*from\s*["']\.\/workReconciliationPagination\.mjs["']/);
  const start = backend.indexOf("export async function reconcileCondominiumWork(");
  const end = backend.indexOf("export async function syncCondominiumWorkDocuments(", start);
  assert.ok(start >= 0 && end > start, "work reconciliation function boundaries exist");
  const reconcile = backend.slice(start, end);
  for (const table of ["condominium_work_documents", "documents", "condominium_work_progress", "condominium_ledger_entries"]) {
    assert.match(reconcile, new RegExp("loadCondominiumWorkReconciliationRows\\(\\s*supabase\\s*,\\s*['\"]"+table+"['\"]"), table + " must use the paginated loader");
  }
  assert.doesNotMatch(reconcile, /\.from\(["'](?:condominium_work_documents|documents|condominium_work_progress|condominium_ledger_entries)["']\)/, "the four reconciliation reads must not retain one-shot queries");
  assert.match(reconcile, /progress\.sort/, "SAL results must retain ascending progress number order");
  assert.match(packageJson.scripts.test, /test-work-reconciliation-pagination\.mjs/, "runtime regression must be wired to npm test");
}
console.log("PASS work reconciliation pagination runtime: baseline 1,000-row cap reproduced; 1,001 ledger, SAL, link and document rows recovered; document filters chunked; later-page errors fail closed; production wiring verified.");
