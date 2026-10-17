import test from "node:test";
import assert from "node:assert/strict";
import { auditLedger, normalizeMigrationName } from "./audit-production-ledger.mjs";

test("normalizes timestamps embedded in a recorded migration name", () => {
  assert.equal(normalizeMigrationName("20260930250000_manual_ai_allocation_intake"), "manual_ai_allocation_intake");
  assert.equal(normalizeMigrationName("20260930250000_manual_ai_allocation_intake.sql"), "manual_ai_allocation_intake");
});

test("distinguishes exact, timestamp mismatch, missing, and ambiguous sources", () => {
  const ledger = { migrations: [
    { version: "20261001000000", name: "first_migration" },
    { version: "20261002000000", name: "second_migration" },
    { version: "20261003000000", name: "missing_migration" },
    { version: "20261004000000", name: "duplicate_migration" },
  ] };
  const files = [
    "20261001000000_first_migration.sql",
    "20261002010000_second_migration.sql",
    "20261004000000_duplicate_migration.sql",
    "20261005000000_duplicate_migration.sql",
  ];
  assert.deepEqual(auditLedger(ledger, files).map((x) => x.status), [
    "exact", "version_mismatch", "missing_source", "ambiguous_name",
  ]);
});
