import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBackupBackendExportAvailabilityError } from "../src/lib/backupExportBackendAvailability.mjs";
import { formatBackupReadErrors } from "../src/lib/backupRestoreSourceErrors.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("const exportWorkspaceBackup = async () => {");
const end = source.indexOf("/* =======================================================\n     CONDOMINI", start);
assert.ok(start >= 0 && end > start, "workspace backup export handler must exist");
const exportHandler = source.slice(start, end);

const missingSupabase = getBackupBackendExportAvailabilityError(false, "workspace-1");
assert.equal(
  missingSupabase,
  "Supabase non configurato: nessuna tabella backend è stata esportata.",
  "an unavailable Supabase client must be reported",
);
const missingWorkspace = getBackupBackendExportAvailabilityError(true, "  ");
assert.equal(
  missingWorkspace,
  "Workspace attivo non disponibile: nessuna tabella backend è stata esportata.",
  "a missing workspace must be reported",
);
assert.equal(
  getBackupBackendExportAvailabilityError(true, "workspace-1"),
  "",
  "a configured backend and workspace allow the backend export",
);

const availabilityCheck = exportHandler.indexOf("getBackupBackendExportAvailabilityError(Boolean(supabase), profile.workspaceId)");
const backendRead = exportHandler.indexOf('loadPaginatedWorkspaceRows(supabase, profile.workspaceId, "condominiums"');
assert.ok(availabilityCheck >= 0, "export must check backend availability");
assert.ok(backendRead > availabilityCheck, "backend availability must be checked before the first backend read");
assert.match(
  exportHandler,
  /if \(backendAvailabilityError\)\s*\{\s*errors\.__backend = backendAvailabilityError;\s*\}\s*else if \(supabase && profile\.workspaceId\)\s*\{/,
  "an unavailable backend must be recorded in backendReadErrors instead of silently skipping every table",
);
assert.match(exportHandler, /backendReadErrors: errors/, "the availability warning must be stored in the exported backup");
assert.match(
  exportHandler,
  /Backup esportato ma incompleto: alcuni dati backend non sono stati esportati/,
  "the UI must not report a full backup when the backend snapshot is absent",
);
assert.ok(
  packageJson.scripts.test.includes("test-backup-export-backend-availability.mjs"),
  "the regression test must be wired into npm test",
);

assert.equal(
  formatBackupReadErrors({ __backend: missingSupabase }),
  "__backend: " + missingSupabase,
  "the existing restore warning path must surface backend unavailability",
);
assert.equal(formatBackupReadErrors({}), "", "a complete backend snapshot must not generate a warning");

console.log("Backup export backend availability regression checks passed.");
