import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  findOverlappingFiscalYear,
  persistFiscalYearRecord,
} from "../src/lib/fiscalYearSave.mjs";

const years = [
  {
    id: "closed-2025",
    condominium_id: "condo-a",
    name: "2025",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    status: "Chiuso",
  },
  {
    id: "open-other-condo",
    condominium_id: "condo-b",
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    status: "Aperto",
  },
];

assert.equal(
  findOverlappingFiscalYear(years, "condo-a", "2025-06-01", "2026-05-31")?.id,
  "closed-2025",
  "overlap in the same condominium must be rejected"
);
assert.equal(
  findOverlappingFiscalYear(years, "condo-a", "2026-01-01", "2026-12-31"),
  null,
  "a period in another condominium must not block this condominium"
);
assert.equal(
  findOverlappingFiscalYear(years, "condo-a", "2026-01-01", "2026-12-31"),
  null,
  "a period starting after the previous year must be allowed"
);

function makeSupabase({ saveResult = { data: { id: "saved-2026" }, error: null }, carryResult = { error: null } } = {}) {
  const calls = { table: null, payload: null, conflict: null, select: null, upsertCount: 0, rpc: [] };
  const query = {
    upsert(payload, options) {
      calls.payload = payload;
      calls.conflict = options?.onConflict;
      calls.upsertCount += 1;
      return this;
    },
    select(columns) {
      calls.select = columns;
      return this;
    },
    async single() {
      return saveResult;
    },
  };
  return {
    calls,
    from(table) {
      calls.table = table;
      return query;
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return carryResult;
    },
  };
}

const form = {
  name: "Esercizio 2026",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  status: "Aperto",
  opening_balance: 125.5,
  notes: "",
};

const blockedClient = makeSupabase();
await assert.rejects(
  persistFiscalYearRecord({
    supabase: blockedClient,
    workspaceId: "workspace-1",
    condominiumId: "condo-a",
    yearForm: { ...form, start_date: "2025-06-01", end_date: "2026-05-31" },
    existingYears: years,
  }),
  (error) => error.code === "FISCAL_YEAR_OVERLAP"
);
assert.equal(blockedClient.calls.upsertCount, 0, "overlap must fail before any write");

const client = makeSupabase();
const saved = await persistFiscalYearRecord({
  supabase: client,
  workspaceId: "workspace-1",
  condominiumId: "condo-a",
  yearForm: form,
  existingYears: years,
});
assert.equal(saved.savedYearId, "saved-2026");
assert.equal(saved.previousYearId, "closed-2025");
assert.equal(client.calls.table, "condominium_fiscal_years");
assert.equal(client.calls.conflict, "condominium_id,start_date,end_date");
assert.equal(client.calls.select, "id");
assert.equal(client.calls.payload.workspace_id, "workspace-1");
assert.equal(client.calls.payload.condominium_id, "condo-a");
assert.equal(client.calls.payload.opening_balance, 125.5);
assert.deepEqual(client.calls.rpc, [{
  name: "generate_fiscal_year_carryovers",
  args: {
    p_workspace_id: "workspace-1",
    p_condominium_id: "condo-a",
    p_source_fiscal_year_id: "closed-2025",
    p_target_fiscal_year_id: "saved-2026",
  },
}]);

const lookupFailure = makeSupabase({ saveResult: { data: null, error: { message: "returning row unavailable" } } });
await assert.rejects(
  persistFiscalYearRecord({
    supabase: lookupFailure,
    workspaceId: "workspace-1",
    condominiumId: "condo-a",
    yearForm: form,
    existingYears: years,
  }),
  /returning row unavailable/
);
assert.equal(lookupFailure.calls.rpc.length, 0, "carryovers must not run without a confirmed saved ID");

const noId = makeSupabase({ saveResult: { data: null, error: null } });
await assert.rejects(
  persistFiscalYearRecord({
    supabase: noId,
    workspaceId: "workspace-1",
    condominiumId: "condo-a",
    yearForm: form,
    existingYears: years,
  }),
  /identificativo non restituito/
);
assert.equal(noId.calls.rpc.length, 0);

const carryFailure = makeSupabase({ carryResult: { error: { message: "carryover trigger failed" } } });
await assert.rejects(
  persistFiscalYearRecord({
    supabase: carryFailure,
    workspaceId: "workspace-1",
    condominiumId: "condo-a",
    yearForm: form,
    existingYears: years,
  }),
  (error) => error.fiscalYearSaved === true && error.savedYearId === "saved-2026"
);

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const saveStart = source.indexOf("async function saveYear(e: React.FormEvent)");
const saveEnd = source.indexOf("async function saveLedger", saveStart);
assert.notEqual(saveStart, -1, "saveYear handler must exist");
assert.ok(saveEnd > saveStart, "saveYear handler boundary must exist");
const saveYearHandler = source.slice(saveStart, saveEnd);
assert.doesNotMatch(saveYearHandler, /\beditingYear\b/, "saveYear must not reference the removed editingYear state");
assert.match(saveYearHandler, /persistFiscalYearRecord/, "saveYear must use the runtime-tested persistence helper");
assert.match(saveYearHandler, /let fiscalYearSaved = false/, "saveYear must track confirmed persistence");
assert.match(saveYearHandler, /fiscalYearSaved = true/, "saveYear must mark the confirmed upsert before later steps");
assert.ok(saveYearHandler.includes("e?.fiscalYearSaved || fiscalYearSaved"), "saveYear must report carryover and refresh failures as partial success");

console.log("Fiscal-year save and carryover runtime regression: PASS");
