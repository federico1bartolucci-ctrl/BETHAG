import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatBackupReadErrors } from "../src/lib/backupRestoreSourceErrors.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const end = source.indexOf("const exportWorkspaceBackup = async () => {", start);
assert.ok(start >= 0 && end > start, "workspace restore function must exist");
const restoreFn = source.slice(start, end);
assert.match(restoreFn, /formatBackupReadErrors\(backup\.backendReadErrors\)/, "restore must inspect source export errors");
assert.match(restoreFn, /sourceReadWarning/, "restore confirmation must warn about an incomplete source backup");
assert.match(restoreFn, /if \(errors\.length \|\| sourceReadErrorSummary\)/, "source export errors must prevent a complete-restoration status");
assert.match(restoreFn, /Il backup sorgente era incompleto/, "partial restore must report export-time failures");
assert.match(restoreFn, /Ripristino completato parzialmente/, "partial source backups must not receive the success message");
assert.ok(packageJson.scripts.test.includes("test-backup-restore-source-errors.mjs"), "regression test must be wired to npm test");

const sample = {
  condominium_ledger_entries: "timeout while reading page 2",
  documents: "permission denied",
};
assert.equal(
  formatBackupReadErrors(sample),
  "condominium_ledger_entries: timeout while reading page 2 | documents: permission denied",
  "all export-time table errors should be surfaced",
);
assert.equal(formatBackupReadErrors({}), "", "a complete backup has no warning summary");
assert.equal(formatBackupReadErrors(null), "", "legacy backups without the field remain valid");
assert.equal(formatBackupReadErrors(["invalid"]), "", "malformed error arrays must not be treated as table errors");
assert.equal(formatBackupReadErrors({ ignored: " ", alsoIgnored: null }), "", "empty entries must be ignored");
console.log("Backup restore incomplete-source regression checks passed.");
