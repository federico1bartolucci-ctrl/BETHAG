import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createAccountingSettingsState,
  resolveAccountingCondominiumId,
  selectAccountingSettingsRow,
} from "../src/lib/accountingSettingsState.mjs";

const defaults = createAccountingSettingsState(null, 2026);
assert.equal(defaults.settings, null);
assert.deepEqual(defaults.form, {
  accounting_start_date: "2026-01-01",
  accounting_end_date: "2026-12-31",
  ordinary_installment_count: 12,
  ordinary_due_dates: "",
  extraordinary_mode: "separata",
  extraordinary_allow_multi_year: true,
});

const settingsA = {
  id: "settings-a",
  condominium_id: "condo-a",
  accounting_start_date: "2025-09-01",
  accounting_end_date: "2026-08-31",
  ordinary_installment_count: 3,
  ordinary_due_dates: ["2025-10-31", "2026-02-28", "2026-06-30"],
  extraordinary_mode: "integrata",
  extraordinary_allow_multi_year: false,
};
const hydratedA = createAccountingSettingsState(settingsA, 2026);
assert.equal(hydratedA.settings, settingsA);
assert.deepEqual(hydratedA.form, {
  accounting_start_date: "2025-09-01",
  accounting_end_date: "2026-08-31",
  ordinary_installment_count: 3,
  ordinary_due_dates: "2025-10-31, 2026-02-28, 2026-06-30",
  extraordinary_mode: "integrata",
  extraordinary_allow_multi_year: false,
});

// Reproduce the stale-row selection when condo A is selected before switching to condo B.
const rows = [settingsA];
assert.equal(selectAccountingSettingsRow(rows, "condo-a"), settingsA);
const staleAForB = createAccountingSettingsState(selectAccountingSettingsRow(rows, "condo-a"), 2026);
assert.equal(staleAForB.form.ordinary_installment_count, 3);
// The fixed lookup uses condo B's resolved ID; a missing row must reset settings to defaults.
const rowB = selectAccountingSettingsRow(rows, "condo-b");
assert.equal(rowB, null);
const stateB = createAccountingSettingsState(rowB, 2026);
assert.equal(stateB.settings, null);
assert.deepEqual(stateB.form, defaults.form);
assert.equal(selectAccountingSettingsRow(rows, null), null);

function createSupabaseMock(result) {
  const calls = [];
  const builder = {
    select(columns) { calls.push(["select", columns]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    maybeSingle() { calls.push(["maybeSingle"]); return Promise.resolve(result); },
  };
  return { calls, supabase: { from(table) { calls.push(["from", table]); return builder; } } };
}
const successMock = createSupabaseMock({ data: { id: "condo-db-b" }, error: null });
const resolvedId = await resolveAccountingCondominiumId({
  supabase: successMock.supabase,
  workspaceId: "workspace-1",
  selectedCondominiumId: 42,
});
assert.equal(resolvedId, "condo-db-b");
assert.deepEqual(successMock.calls, [
  ["from", "condominiums"],
  ["select", "id"],
  ["eq", "workspace_id", "workspace-1"],
  ["eq", "legacy_id", 42],
  ["maybeSingle"],
]);
const missingMock = createSupabaseMock({ data: null, error: null });
await assert.rejects(
  resolveAccountingCondominiumId({ supabase: missingMock.supabase, workspaceId: "workspace-1", selectedCondominiumId: 42 }),
  /Condominio selezionato non trovato nel database/,
);
const errorMock = createSupabaseMock({ data: null, error: new Error("lookup failed") });
await assert.rejects(
  resolveAccountingCondominiumId({ supabase: errorMock.supabase, workspaceId: "workspace-1", selectedCondominiumId: 42 }),
  /lookup failed/,
);
const allMock = createSupabaseMock({ data: null, error: null });
assert.equal(await resolveAccountingCondominiumId({ supabase: allMock.supabase, workspaceId: "workspace-1", selectedCondominiumId: "all" }), null);
assert.deepEqual(allMock.calls, []);
assert.equal(await resolveAccountingCondominiumId({ supabase: null, workspaceId: "workspace-1", selectedCondominiumId: 42 }), null);

const component = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = await readFile("package.json", "utf8");
assert.match(component, /createAccountingSettingsState/);
assert.match(component, /resolveAccountingCondominiumId/);
assert.match(component, /selectAccountingSettingsRow\(settingsResult\.data \?\? \[\], resolvedDbCondominiumId\)/);
assert.match(component, /setAccountingSettings\(resetSettingsState\.settings/);
assert.match(component, /setAccountingSettingsForm\(resetSettingsState\.form/);
assert.match(component, /setAccountingSettingsReady\(false\)/);
assert.match(component, /setAccountingSettingsReady\(true\)/);
assert.match(component, /disabled=\{saving \|\| !accountingSettingsReady \|\| !dbCondominiumId\}/);
assert.match(packageJson, /test-accounting-settings-reset-runtime\.mjs/);
console.log("Accounting settings cross-condominium stale-state runtime regression: PASS");
