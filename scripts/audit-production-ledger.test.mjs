import test from "node:test";
import assert from "node:assert/strict";
import { auditLedger, normalizeMigrationName } from "./audit-production-ledger.mjs";

test("normalizes timestamps embedded in a recorded migration name", () => {
  assert.equal(normalizeMigrationName("20260930250000_manual_ai_allocation_intake"), "manual_ai_allocation_intake");
  assert.equal(normalizeMigrationName("20260930250000_manual_ai_allocation_intake.sql"), "manual_ai_allocation_intake");
});

test("distinguishes exact source, version mismatch, missing source, and conflicting SQL blobs", () => {
  const ledger = { migrations: [
    { version: "20261001000000", name: "first_migration" },
    { version: "20261002000000", name: "second_migration" },
    { version: "20261003000000", name: "missing_migration" },
    { version: "20261004000000", name: "duplicate_migration" },
  ] };
  const sources = [
    { path: "supabase/migrations/20261001000000_first_migration.sql", version: "20261001000000", name: "first_migration", sha: "a", branches: ["main"] },
    { path: "supabase/migrations/20261002010000_second_migration.sql", version: "20261002010000", name: "second_migration", sha: "b", branches: ["main"] },
    { path: "supabase/migrations/20261004000000_duplicate_migration.sql", version: "20261004000000", name: "duplicate_migration", sha: "c", branches: ["main"] },
    { path: "supabase/migrations/20261004000000_duplicate_migration.sql", version: "20261004000000", name: "duplicate_migration", sha: "d", branches: ["recovery"] },
  ];
  assert.deepEqual(auditLedger(ledger, sources).map((x) => x.status), [
    "exact", "version_mismatch", "missing_source", "ambiguous_name",
  ]);
});

test("an exact ledger version takes precedence over conflicting copies at other versions", () => {
  const ledger = { migrations: [{ version: "20261001000000", name: "first_migration" }] };
  const sources = [
    { path: "supabase/migrations/20261001000000_first_migration.sql", version: "20261001000000", name: "first_migration", sha: "a", branches: ["main"] },
    { path: "supabase/migrations/20261002000000_first_migration.sql", version: "20261002000000", name: "first_migration", sha: "b", branches: ["recovery"] },
  ];
  assert.equal(auditLedger(ledger, sources)[0].status, "exact");
});
