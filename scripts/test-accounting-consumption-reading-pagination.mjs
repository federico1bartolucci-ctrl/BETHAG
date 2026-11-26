import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadConsumptionReadings } from "../src/lib/consumptionReadingsPagination.mjs";

const PAGE_SIZE = 500;
const workspaceId = "workspace-1";
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

function compareRows(a, b) {
  if (a.period_end === null && b.period_end !== null) return 1;
  if (a.period_end !== null && b.period_end === null) return -1;
  if (a.period_end !== b.period_end) return a.period_end > b.period_end ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id > b.id ? -1 : 1;
}

function makeRows() {
  const rows = Array.from({ length: 1000 }, (_, index) => ({
    id: id(index + 1),
    workspace_id: workspaceId,
    condominium_id: "condo-other",
    fiscal_year_id: "fy-other",
    service_type: "Gas",
    period_end: "2026-11-26",
  }));
  rows.push({
    id: id(0),
    workspace_id: workspaceId,
    condominium_id: "condo-target",
    fiscal_year_id: "fy-target",
    service_type: "Acqua",
    period_end: "2025-01-01",
  });
  rows.push({
    id: id(1001),
    workspace_id: workspaceId,
    condominium_id: "condo-other",
    fiscal_year_id: "fy-other",
    service_type: "Gas",
    period_end: null,
  });
  rows.push({
    id: id(2000),
    workspace_id: "workspace-2",
    condominium_id: "condo-foreign",
    fiscal_year_id: "fy-foreign",
    service_type: "Acqua",
    period_end: "2026-12-01",
  });
  return rows;
}

function makeClient(initialRows, options = {}) {
  const records = initialRows.slice();
  const calls = [];
  let pageNumber = 0;

  function applyQuery(state, range) {
    let filtered = records.filter((row) => row.workspace_id === state.workspaceId);
    if (state.cursor) {
      const cursor = state.cursor;
      filtered = filtered.filter((row) => cursor.period_end === null
        ? row.period_end === null && row.id < cursor.id
        : row.period_end === null
          || row.period_end < cursor.period_end
          || (row.period_end === cursor.period_end && row.id < cursor.id));
    }
    filtered.sort(compareRows);
    const count = filtered.length;
    if (state.head) return { data: null, error: null, count };
    const [from, to] = range ?? [0, filtered.length - 1];
    let data = filtered.slice(from, to + 1);
    if (Number.isInteger(options.rowCap)) data = data.slice(0, options.rowCap);
    return { data, error: null, count };
  }

  const client = {
    from(table) {
      assert.equal(table, "condominium_consumption_readings");
      const state = { workspaceId: null, cursor: null, head: false, orders: [], selectOptions: null };
      const query = {
        select(columns, selectOptions = {}) {
          state.columns = columns;
          state.selectOptions = selectOptions;
          state.head = selectOptions.head === true;
          return query;
        },
        eq(column, value) {
          if (column === "workspace_id") state.workspaceId = value;
          return query;
        },
        order(column, orderOptions) {
          state.orders.push([column, orderOptions]);
          return query;
        },
        or(filter) {
          const match = filter.match(/^period_end\.lt\.([^,]+),and\(period_end\.eq\.([^,]+),id\.lt\.([^)]+)\),period_end\.is\.null$/);
          assert.ok(match, `unexpected keyset cursor: ${filter}`);
          assert.equal(match[1], match[2]);
          state.cursor = { period_end: match[1], id: match[3] };
          return query;
        },
        is(column, value) {
          assert.equal(column, "period_end");
          assert.equal(value, null);
          state.cursor = { period_end: null, id: state.idLt };
          return query;
        },
        lt(column, value) {
          assert.equal(column, "id");
          state.idLt = value;
          if (state.cursor?.period_end === null) state.cursor.id = value;
          return query;
        },
        range(from, to) {
          pageNumber += 1;
          calls.push({ pageNumber, from, to, workspaceId: state.workspaceId, cursor: state.cursor, selectOptions: state.selectOptions });
          if (options.insertBeforePage === pageNumber) records.push(options.insertRow);
          if (options.deleteBeforePage === pageNumber) {
            const index = records.findIndex((row) => row.id === options.deleteId);
            if (index >= 0) records.splice(index, 1);
          }
          if (options.failPage === pageNumber) {
            return Promise.resolve({ data: null, error: new Error("simulated page failure"), count: null });
          }
          return Promise.resolve(applyQuery(state, [from, to]));
        },
        then(resolve, reject) {
          return Promise.resolve(applyQuery(state, null)).then(resolve, reject);
        },
      };
      return query;
    },
  };

  return { client, records, calls };
}

const initialRows = makeRows();

// Reproduce the old one-shot PostgREST read: the target condominium's only
// matching reading sits after 1,000 newer rows belonging to other units.
{
  const legacy = makeClient(initialRows);
  const { data, error } = await legacy.client
    .from("condominium_consumption_readings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("period_end", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(0, 999);
  assert.equal(error, null);
  assert.equal(data.length, 1000);
  const legacyMatches = data.filter((row) =>
    row.condominium_id === "condo-target"
    && row.fiscal_year_id === "fy-target"
    && row.service_type === "Acqua"
  );
  assert.equal(legacyMatches.length, 0, "the capped baseline must omit the older target reading");
}

// The fixed loader must retrieve every workspace row, including the reading
// beyond the cap and nullable period_end rows, with stable same-date tie-breaks.
{
  const paged = makeClient(initialRows);
  const result = await loadConsumptionReadings(paged.client, workspaceId);
  assert.equal(result.error, null);
  assert.equal(result.data.length, 1002);
  assert.equal(new Set(result.data.map((row) => row.id)).size, 1002);
  assert.ok(result.data.some((row) => row.id === id(0)), "older target reading must be recovered");
  assert.equal(result.data.at(-1).period_end, null, "NULL period_end rows must remain reachable");
  const matches = result.data.filter((row) =>
    row.condominium_id === "condo-target"
    && row.fiscal_year_id === "fy-target"
    && row.service_type === "Acqua"
  );
  assert.equal(matches.length, 1);
  assert.equal(paged.calls.length, 3, "1,002 rows must be fetched in three 500-row keyset pages");
  assert.ok(paged.calls.every((call) => call.from === 0 && call.to === PAGE_SIZE - 1), "keyset pages must not use shifting offsets");
  assert.ok(paged.calls.every((call) => call.workspaceId === workspaceId), "every page must remain workspace-scoped");
  assert.ok(paged.calls.every((call) => call.selectOptions?.count === "exact"), "every page must request an exact remaining-row count");
}

// More than one page of NULL period_end values must use the ID-only cursor.
{
  const nullRows = Array.from({ length: 501 }, (_, index) => ({
    id: id(index + 1),
    workspace_id: workspaceId,
    condominium_id: "condo-null",
    fiscal_year_id: "fy-null",
    service_type: "Acqua",
    period_end: null,
  }));
  const nullPaged = makeClient(nullRows);
  const result = await loadConsumptionReadings(nullPaged.client, workspaceId);
  assert.equal(result.data.length, 501);
  assert.equal(nullPaged.calls.length, 2);
  assert.equal(nullPaged.calls[1].cursor.period_end, null, "NULL cursor must use the period_end IS NULL branch");
  assert.equal(nullPaged.calls[1].cursor.id, id(2), "NULL cursor must continue with the UUID tie-break");
}

// A lower server row cap must not be mistaken for a complete short page.
{
  const capped = makeClient(initialRows, { rowCap: 200 });
  await assert.rejects(
    loadConsumptionReadings(capped.client, workspaceId),
    /Risposta incompleta del server/
  );
}

// Changes to the remaining set or total count during loading must fail closed.
{
  const inserted = makeClient(initialRows, {
    insertBeforePage: 2,
    insertRow: {
      id: id(3000),
      workspace_id: workspaceId,
      condominium_id: "condo-other",
      fiscal_year_id: "fy-other",
      service_type: "Gas",
      period_end: "2026-12-01",
    },
  });
  await assert.rejects(loadConsumptionReadings(inserted.client, workspaceId), /cambiat[oe].*caricamento/i);

  const deleted = makeClient(initialRows, { deleteBeforePage: 2, deleteId: id(0) });
  await assert.rejects(loadConsumptionReadings(deleted.client, workspaceId), /cambiat[oe].*caricamento/i);
}

// Later-page errors must never return a silently truncated list.
{
  const failed = makeClient(initialRows, { failPage: 2 });
  await assert.rejects(loadConsumptionReadings(failed.client, workspaceId), /simulated page failure/);
}

// Duplicate IDs across otherwise ordered pages are treated as malformed data.
{
  const duplicateRows = [
    { id: id(77), workspace_id: workspaceId, condominium_id: "c1", fiscal_year_id: "fy1", service_type: "Acqua", period_end: "2026-11-26" },
    { id: id(77), workspace_id: workspaceId, condominium_id: "c1", fiscal_year_id: "fy1", service_type: "Acqua", period_end: "2025-11-26" },
  ];
  const duplicate = makeClient(duplicateRows);
  await assert.rejects(loadConsumptionReadings(duplicate.client, workspaceId, 1), /duplicata/);
}

// Production wiring: AccountingPage must load the complete set before the
// selected-condominium/service/year "no data" guard runs.
{
  const accounting = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(accounting, /import \{ loadConsumptionReadings \} from ["']\.\/lib\/consumptionReadingsPagination\.mjs["']/);
  const loadStart = accounting.indexOf("async function load()");
  const loadEnd = accounting.indexOf("  useEffect(", loadStart);
  assert.ok(loadStart >= 0 && loadEnd > loadStart, "AccountingPage load function must be detectable");
  const loadBody = accounting.slice(loadStart, loadEnd);
  assert.match(loadBody, /loadConsumptionReadings\(supabase, workspaceId\)/);
  assert.doesNotMatch(loadBody, /\.from\(["']condominium_consumption_readings["']\)/);
  assert.match(loadBody, /setConsumptionReadings\(\(consumptionReadingsResult\.data \?\? \[\]\)/);
  assert.ok(packageJson.scripts.test.includes("test-accounting-consumption-reading-pagination.mjs"), "runtime regression must run under npm test");
}

console.log("PASS: the 1,000-row PostgREST cap omitted an older selected-condominium consumption reading; keyset pagination recovers it.");
console.log("PASS: same-date UUID tie-breaks and NULL period_end rows are complete without offset pagination.");
console.log("PASS: lower server caps, concurrent row-count changes, duplicate IDs and later-page failures fail closed.");
console.log("PASS: AccountingPage uses the complete paginated workspace set before the no-consumption-data guard.");
