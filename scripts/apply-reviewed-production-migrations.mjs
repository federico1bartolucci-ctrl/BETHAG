#!/usr/bin/env node
/**
 * Guarded, canonical-version-preserving BETHAG Production migration runner.
 *
 * This runner deliberately does NOT call Supabase apply_migration. It executes
 * each reviewed SQL file and writes the matching canonical ledger row in the
 * same PostgreSQL transaction. It is disabled unless the operator explicitly
 * sets all required production safety environment variables documented below.
 *
 * Required:
 *   DATABASE_URL=<direct/session-pooler PostgreSQL URL with DDL privileges>
 *   BETHAG_PRODUCTION_PROJECT_REF=tctcgptrsmvgajqjgnev
 *   BETHAG_ALLOW_PRODUCTION_MIGRATIONS=YES
 *   BETHAG_CUTOVER_PLAN_APPROVED=YES
 *   BETHAG_QA_APP_ACCEPTANCE_COMPLETE=YES
 *   BETHAG_QA_APP12_PROVIDER_VERIFIED=YES
 *   BETHAG_PRODUCTION_DATA_API_EXPOSURE_VERIFIED=YES
 *   BETHAG_PRODUCTION_BACKUP_VERIFIED=YES OR a named/timestamped residual-risk acceptance
 *
 * Run only from a clean checkout of the reviewed branch, after approval,
 * backup-risk disposition, and application smoke tests. Never use on QA to
 * repair its existing environment-specific ledger entries.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const projectRef = "tctcgptrsmvgajqjgnev";
const expectedHead = { version: "20261104222229", name: "reconcile_production_acl_least_privilege" };
const expectedLedgerCount = 248;
const manifestPath = join(root, "supabase/rebuild/production-migration-cutover-freeze-20261105.json");
const snapshotPath = join(root, "supabase/rebuild/production-ledger-20261105.json");

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
}

function runPsql(args, { input } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "--no-psqlrc", "--dbname", process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", ...args], {
      env: process.env,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(`psql exited ${code}: ${stderr || stdout}`));
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

async function liveLedger() {
  const sql = "SELECT COALESCE(json_agg(json_build_object('version', version, 'name', name) ORDER BY version), '[]'::json)::text FROM supabase_migrations.schema_migrations;";
  return JSON.parse(await runPsql(["-At", "-c", sql]));
}

function comparePairs(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: row count mismatch`);
  for (let i = 0; i < expected.length; i += 1) {
    assert.equal(actual[i]?.version, expected[i]?.version, `${label}: version mismatch at row ${i + 1}`);
    assert.equal(actual[i]?.name, expected[i]?.name, `${label}: name mismatch at row ${i + 1}`);
  }
}

function quoteSqlLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const rehearsal = process.env.BETHAG_CUTOVER_REHEARSAL === "YES";
  assert.ok(process.env.DATABASE_URL, "Blocked: DATABASE_URL is required; do not print or log it.");
  assert.ok(!process.env.DATABASE_URL.includes("YOUR_") && !process.env.DATABASE_URL.includes("placeholder"),
    "Blocked: DATABASE_URL appears to be a placeholder.");
  if (rehearsal) {
    let target;
    try { target = new URL(process.env.DATABASE_URL); } catch { throw new Error("Blocked: invalid DATABASE_URL."); }
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
      "Blocked: rehearsal mode is restricted to a local PostgreSQL host.");
    assert.ok(!process.env.BETHAG_ALLOW_PRODUCTION_MIGRATIONS && !process.env.BETHAG_PRODUCTION_PROJECT_REF,
      "Blocked: rehearsal mode must not be combined with Production authorization variables.");
    console.log("REHEARSAL MODE: local PostgreSQL only; Production credentials/authorization are not accepted.");
  } else {
    assert.equal(process.env.BETHAG_ALLOW_PRODUCTION_MIGRATIONS, "YES",
      "Blocked: set BETHAG_ALLOW_PRODUCTION_MIGRATIONS=YES only after formal cutover approval.");
    assert.equal(process.env.BETHAG_PRODUCTION_PROJECT_REF, projectRef,
      `Blocked: BETHAG_PRODUCTION_PROJECT_REF must explicitly equal ${projectRef}.`);
    assert.equal(process.env.BETHAG_CUTOVER_PLAN_APPROVED, "YES",
      "Blocked: the exact cutover plan, maintenance window, communications and rollback procedure are not approved.");
    assert.equal(process.env.BETHAG_QA_APP_ACCEPTANCE_COMPLETE, "YES",
      "Blocked: QA application acceptance is not complete.");
    assert.equal(process.env.BETHAG_QA_APP12_PROVIDER_VERIFIED, "YES",
      "Blocked: QA email provider delivery has not been verified.");
    assert.equal(process.env.BETHAG_PRODUCTION_DATA_API_EXPOSURE_VERIFIED, "YES",
      "Blocked: Production Data API exposure for provider-managed schemas has not been verified in Dashboard.");
    const physicalRestoreVerified = process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED === "YES";
    const riskRecord = manifest.backup_restore_risk_acceptance;
    const riskAccepted = riskRecord?.accepted === true
      && Boolean(riskRecord.accepted_by)
      && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(riskRecord.accepted_at_utc ?? "")
      && Boolean(riskRecord.evidence_reference);
    assert.ok(physicalRestoreVerified || riskAccepted,
      "Blocked: verify the provider physical restore or record explicit named/timestamped residual-risk acceptance in the frozen manifest.");
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  assert.equal(manifest.status, "FROZEN_FOR_REVIEW_AUTHORIZED_BY_USER_GATES_PENDING",
    "Manifest status changed; review the plan before proceeding.");
  assert.equal(manifest.live_ledger.rows, expectedLedgerCount);
  assert.equal(manifest.live_ledger.exact_version_name_pair_match, true);
  assert.equal(snapshot.count, expectedLedgerCount);
  assert.equal(snapshot.migrations.length, expectedLedgerCount);
  comparePairs(snapshot.migrations, snapshot.migrations, "Stored Production snapshot self-check");
  const productionOnly = manifest.live_ledger.production_only_migration;
  assert.ok(snapshot.migrations.some(row => row.version === productionOnly.version && row.name === productionOnly.name),
    "The already-applied Production-only migration must remain inside the historical snapshot.");

  const expected = manifest.sequence;
  assert.equal(expected.length, 19, "Expected exactly nineteen reviewed incremental migrations.");
  const migrationBodies = [];
  for (const item of expected) {
    const filename = item.file;
    assert.match(filename, /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/);
    const version = filename.slice(0, 14);
    const name = filename.slice(15, -4);
    assert.ok(!snapshot.migrations.some((row) => row.version === version), `Migration ${filename} is already present in the frozen Production ledger.`);
    assert.equal(item.production_status, "PENDING_NOT_APPLIED");
    const sql = await readFile(join(root, "supabase/migrations", filename), "utf8");
    assert.equal(gitBlobSha(sql), item.git_blob_sha, `SQL content differs from reviewed SHA for ${filename}.`);
    assert.ok(!sql.includes("$bethag_migration_body$"), `Reserved SQL delimiter found in ${filename}.`);
    migrationBodies.push({ filename, version, name, sql });
  }

  console.log("Checking live Production migration ledger against the complete frozen 248-row snapshot...");
  const initial = await liveLedger();
  comparePairs(initial, snapshot.migrations, "Live Production ledger vs frozen snapshot");
  assert.deepEqual(initial.at(-1), expectedHead, "Production ledger head is not the frozen expected head.");
  console.log("PASS: exact 248-row preflight. No history rows will be rewritten or deleted.");

  const tempDir = await mkdtemp(join(tmpdir(), "bethag-cutover-"));
  try {
    for (let index = 0; index < migrationBodies.length; index += 1) {
      const migration = migrationBodies[index];
      const current = await liveLedger();
      const expectedCount = expectedLedgerCount + index;
      assert.equal(current.length, expectedCount,
        `STOP before ${migration.filename}: expected ${expectedCount} rows, found ${current.length}.`);
      const historicalVersions = new Set(snapshot.migrations.map((row) => row.version));
      const currentHistorical = current.filter((row) => historicalVersions.has(row.version));
      comparePairs(currentHistorical, snapshot.migrations, `Historical 248-row preservation before ${migration.filename}`);
      const currentCanonical = current.filter((row) => !historicalVersions.has(row.version));
      comparePairs(currentCanonical, migrationBodies.slice(0, index).map(({ version, name }) => ({ version, name })),
        `Previously applied canonical rows before ${migration.filename}`);
      assert.ok(!current.some((row) => row.version === migration.version),
        `STOP: version ${migration.version} is already present; no automatic repair is attempted.`);

      const delimiter = "$bethag_migration_body$";
      const statementsArray = `ARRAY[${delimiter}${migration.sql}${delimiter}]`;
      const wrapped = [
        "BEGIN;",
        "SELECT pg_advisory_xact_lock(hashtext('bethag-production-canonical-cutover'));",
        migration.sql,
        `INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by, idempotency_key)`,
        `VALUES (${quoteSqlLiteral(migration.version)}, ${quoteSqlLiteral(migration.name)}, ${statementsArray}, 'bethag-reviewed-cutover', NULL);`,
        "COMMIT;",
        "",
      ].join("\n");
      const tempPath = join(tempDir, migration.filename + ".transaction.sql");
      await writeFile(tempPath, wrapped, { encoding: "utf8", mode: 0o600 });
      console.log(`Applying ${migration.filename} in one transaction...`);
      await runPsql(["-f", tempPath]);
      const after = await liveLedger();
      assert.equal(after.length, expectedCount + 1, `Postcondition failed after ${migration.filename}: ledger count.`);
      const afterHistorical = after.filter((row) => historicalVersions.has(row.version));
      comparePairs(afterHistorical, snapshot.migrations,
        `Historical 248-row preservation after ${migration.filename}`);
      const afterCanonical = after.filter((row) => !historicalVersions.has(row.version));
      comparePairs(afterCanonical, migrationBodies.slice(0, index + 1).map(({ version, name }) => ({ version, name })),
        `Canonical migration rows after ${migration.filename}`);
      console.log(`PASS: ${migration.version} recorded canonically; historical rows unchanged.`);
    }

    const finalLedger = await liveLedger();
    assert.equal(finalLedger.length, 267, "Final ledger must contain 248 historical + 19 canonical rows.");
    const historicalVersions = new Set(snapshot.migrations.map((row) => row.version));
    comparePairs(finalLedger.filter((row) => historicalVersions.has(row.version)), snapshot.migrations, "Final historical ledger preservation");
    comparePairs(finalLedger.filter((row) => !historicalVersions.has(row.version)),
      migrationBodies.map(({ version, name }) => ({ version, name })), "Final canonical incremental migration sequence");
    const expectedFinal = [...snapshot.migrations, ...migrationBodies.map(({ version, name }) => ({ version, name }))].sort((a, b) => a.version.localeCompare(b.version));
    comparePairs(finalLedger, expectedFinal, "Final complete ledger set");
    console.log(JSON.stringify({
      status: "CANONICAL_MIGRATION_LEDGER_PASS",
      target: rehearsal ? "isolated-local-postgresql-rehearsal" : "production",
      production_project_ref: rehearsal ? null : projectRef,
      preserved_historical_rows: expectedLedgerCount,
      canonical_incremental_rows_added: migrationBodies.length,
      final_ledger_count: finalLedger.length,
      final_head: finalLedger.at(-1),
      note: "Run the documented SQL postflight and application smoke tests before considering cutover complete.",
    }, null, 2));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`CUTOVER STOPPED: ${error.message}`);
  process.exitCode = 1;
});
