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
 *   BETHAG_APPROVED_SOURCE_COMMIT_SHA=<owner-approved source SHA>
 *   BETHAG_APPROVED_RELEASE_FINGERPRINT=<owner-approved SHA-256 release fingerprint>
 *
 * The owner-approved source SHA and deterministic executable release fingerprint
 * are separate from the Git commit used to record approval. Documentation and
 * approval-metadata commits do not invalidate the fingerprint; critical code,
 * SQL, workflow, preflight or postflight changes do.
 *
 * Run only from a clean checkout of the reviewed branch, after approval,
 * backup-risk disposition, and application smoke tests. Never use on QA to
 * repair its existing environment-specific ledger entries.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getApplicationTest, splitChangedPaths, frozenManifestPayload, releaseFingerprint } from "./lib/release-readiness-utils.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const projectRef = "tctcgptrsmvgajqjgnev";
const expectedHead = { version: "20261104222229", name: "reconcile_production_acl_least_privilege" };
const expectedLedgerCount = 248;
const manifestPath = join(root, "supabase/rebuild/production-migration-cutover-freeze-20261105.json");
const snapshotPath = join(root, "supabase/rebuild/production-ledger-20261105.json");

function gitBlobSha(content) {
  // Git stores text blobs with LF. Windows checkouts may materialize the same
  // reviewed SQL with CRLF; normalize only line endings before pin comparison.
  // SQL semantics and every non-newline byte remain covered by the frozen hash.
  const canonicalContent = content.replace(/\r\n/g, "\n");
  const bytes = Buffer.from(canonicalContent, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
}

function pgPassEscape(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll(":", "\\:");
}

async function runPsql(args, { input } = {}) {
  const psqlExecutable = process.env.BETHAG_PSQL_BIN || "psql";
  const childEnv = { ...process.env };
  let passFileDir = null;
  try {
    if (process.env.DATABASE_URL) {
      let connectionUrl;
      try { connectionUrl = new URL(process.env.DATABASE_URL); }
      catch { throw new Error("Blocked: invalid DATABASE_URL."); }
      assert.ok(["postgres:", "postgresql:"].includes(connectionUrl.protocol),
        "Blocked: DATABASE_URL must use the PostgreSQL protocol.");
      childEnv.PGHOST = connectionUrl.hostname;
      childEnv.PGPORT = connectionUrl.port || "5432";
      childEnv.PGDATABASE = decodeURIComponent(connectionUrl.pathname.slice(1));
      childEnv.PGUSER = decodeURIComponent(connectionUrl.username);
      for (const [parameter, envName] of [
        ["sslmode", "PGSSLMODE"], ["application_name", "PGAPPNAME"],
        ["connect_timeout", "PGCONNECT_TIMEOUT"], ["options", "PGOPTIONS"],
        ["target_session_attrs", "PGTARGETSESSIONATTRS"],
      ]) {
        if (connectionUrl.searchParams.has(parameter)) childEnv[envName] = connectionUrl.searchParams.get(parameter);
      }
      const password = decodeURIComponent(connectionUrl.password);
      if (password) {
        passFileDir = await mkdtemp(join(tmpdir(), "bethag-pgpass-"));
        const passFile = join(passFileDir, "pgpass");
        const passLine = [childEnv.PGHOST, childEnv.PGPORT, childEnv.PGDATABASE, childEnv.PGUSER, password].map(pgPassEscape).join(":") + String.fromCharCode(10);
        await writeFile(passFile, passLine, { encoding: "utf8", mode: 0o600 });
        await chmod(passFile, 0o600);
        childEnv.PGPASSFILE = passFile;
      }
      // Do not expose a credential-bearing URL in psql argv or child env.
      delete childEnv.DATABASE_URL;
      delete childEnv.PGPASSWORD;
    } else if (childEnv.PGPASSWORD) {
      passFileDir = await mkdtemp(join(tmpdir(), "bethag-pgpass-"));
      const passFile = join(passFileDir, "pgpass");
      const passLine = [childEnv.PGHOST, childEnv.PGPORT || "5432", childEnv.PGDATABASE, childEnv.PGUSER, childEnv.PGPASSWORD].map(pgPassEscape).join(":") + String.fromCharCode(10);
      await writeFile(passFile, passLine, { encoding: "utf8", mode: 0o600 });
      await chmod(passFile, 0o600);
      childEnv.PGPASSFILE = passFile;
      delete childEnv.PGPASSWORD;
    }
    const child = spawn(psqlExecutable, ["-X", "--no-psqlrc", "-v", "ON_ERROR_STOP=1", ...args], {
      env: childEnv,
      stdio: [input === undefined ? "inherit" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    await new Promise((resolvePromise, reject) => {
      child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
      child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(`psql exited ${code}: ${stderr || stdout}`));
      });
      if (input !== undefined) child.stdin.end(input);
    });
    return stdout.trim();
  } finally {
    if (passFileDir) await rm(passFileDir, { recursive: true, force: true });
  }
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

const fingerprintCriticalPaths = ["scripts/apply-reviewed-production-migrations.mjs","scripts/verify-canonical-cutover-runner.mjs","scripts/lib/release-readiness-utils.mjs","scripts/test-release-readiness-utils.mjs","scripts/test-canonical-cutover-runner.mjs","scripts/verify-release-readiness.mjs",".github/workflows/build.yml",".github/workflows/final-qa-collaudo.yml","supabase/rebuild/production-cutover-preflight-20261105.sql","supabase/rebuild/production-cutover-postflight-20261105.sql","supabase/rebuild/production-ledger-20261105.json","supabase/rebuild/live-migration-ledgers-20261105.json"];
async function calculateReleaseFingerprint(manifest, sourceCommitSha) {
  const paths = [...fingerprintCriticalPaths, ...manifest.sequence.map((item) => "supabase/migrations/" + item.file), ...manifest.live_ledger.forward_migrations_after_2026_11_02_freeze.map((item) => "supabase/rebuild/production-forward-migrations/" + item.file), "supabase/rebuild/production-forward-migrations/" + manifest.live_ledger.production_only_migration.file];
  const fileContents = Object.fromEntries(await Promise.all([...new Set(paths)].sort().map(async (path) => [path, await readFile(join(root, path), "utf8")])));
  return releaseFingerprint({ sourceCommitSha, manifest, fileContents });
}
function assertFinalApprovalRecord(manifest, approvedSourceCommitSha, calculatedFingerprint) {
  const approval = manifest.user_authorization;
  assert.equal(manifest.status, "FROZEN_FOR_REVIEW_APPROVED",
    "Blocked: the frozen manifest is still pending final cutover approval.");
  assert.equal(approval?.status, "RECEIVED",
    "BETHAG_CUTOVER_APPROVAL_NOT_RECORDED: explicit final user approval has not been recorded in the frozen manifest.");
  assert.match(approvedSourceCommitSha, /^[0-9a-f]{40}$/,
    "Blocked: BETHAG_APPROVED_SOURCE_COMMIT_SHA must identify the exact owner-approved source release.");
  assert.equal(approval?.approved_commit_sha, approvedSourceCommitSha,
    "Blocked: written approval does not name the owner-approved source release.");
  assert.match(calculatedFingerprint, /^[0-9a-f]{64}$/,
    "Blocked: the executable release fingerprint could not be calculated.");
  assert.equal(approval?.approved_release_fingerprint, calculatedFingerprint,
    "Blocked: written owner approval does not cover this exact executable release fingerprint.");
  assert.equal(process.env.BETHAG_APPROVED_RELEASE_FINGERPRINT, calculatedFingerprint,
    "Blocked: operator has not explicitly supplied the owner-approved release fingerprint.");
  assert.ok(Boolean(approval?.approved_by)
    && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(approval?.approved_at_utc ?? "")
    && Boolean(approval?.approval_reference),
  "Blocked: final approval record must identify approver, UTC timestamp and evidence reference.");
  assert.deepEqual(approval?.approved_migration_hashes,
    manifest.sequence.map(({ file, git_blob_sha }) => ({ file, git_blob_sha })),
    "Blocked: written approval does not cover the exact ordered nineteen SQL file hashes.");
}

function quoteSqlLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const rehearsal = process.env.BETHAG_CUTOVER_REHEARSAL === "YES";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasLibpqEnvironment = Boolean(process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER);
  assert.ok(hasDatabaseUrl || hasLibpqEnvironment,
    "Blocked: configure DATABASE_URL or the libpq PGHOST/PGPORT/PGDATABASE/PGUSER variables locally; never print or log credentials.");
  if (hasDatabaseUrl) {
    assert.ok(!process.env.DATABASE_URL.includes("YOUR_") && !process.env.DATABASE_URL.includes("placeholder"),
      "Blocked: DATABASE_URL appears to be a placeholder.");
  }
  let targetUrl = null;
  if (hasDatabaseUrl) {
    try { targetUrl = new URL(process.env.DATABASE_URL); } catch { throw new Error("Blocked: invalid DATABASE_URL."); }
  }
  const targetHost = targetUrl?.hostname || process.env.PGHOST;
  const targetUser = targetUrl ? decodeURIComponent(targetUrl.username) : process.env.PGUSER;
  const targetDatabase = targetUrl ? decodeURIComponent(targetUrl.pathname.substring(1)) : process.env.PGDATABASE;
  const preflightOnly = process.env.BETHAG_CUTOVER_PREFLIGHT_ONLY === "YES";
  const expectedCommitSha = process.env.BETHAG_EXPECTED_COMMIT_SHA?.trim() || "";
  const approvedSourceCommitSha = process.env.BETHAG_APPROVED_SOURCE_COMMIT_SHA?.trim() || "";
  if (!rehearsal) {
    assert.match(expectedCommitSha, /^[0-9a-f]{40}$/,
      "Blocked: set BETHAG_EXPECTED_COMMIT_SHA to the full approved 40-character commit SHA.");
    const checkedOutCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.equal(checkedOutCommitSha, expectedCommitSha,
      "Blocked: checked-out commit does not match BETHAG_EXPECTED_COMMIT_SHA.");
    const workingTree = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
    const unexpectedWorkingTreeEntries = workingTree.split("\n").filter(Boolean).filter((entry) =>
      entry !== "?? node_modules/" && entry !== "?? package-lock.json");
    assert.equal(unexpectedWorkingTreeEntries.length, 0,
      "Blocked: tracked changes or unexpected untracked files exist; use a clean checkout of the approved commit.");

    const testedQaSha = process.env.BETHAG_QA_TESTED_COMMIT_SHA?.trim() || "";
    assert.match(testedQaSha, /^[0-9a-f]{40}$/,
      "Blocked: set BETHAG_QA_TESTED_COMMIT_SHA to the full commit SHA certified by Final QA, Build and Baseline Safety.");
    const appEvidence = JSON.parse(await readFile(
      join(root, "supabase/rebuild/qa-final-collaudo-20261105.json"), "utf8"
    ));
    assert.equal(appEvidence.reviewed_head_sha, testedQaSha,
      "Blocked: pinned QA evidence does not match BETHAG_QA_TESTED_COMMIT_SHA.");
    for (const workflow of ["final_qa_collaudo", "build", "baseline_safety"]) {
      assert.ok(appEvidence.workflow_runs?.[workflow],
        `Blocked: required ${workflow} evidence is missing.`);
    }
    for (const [workflow, run] of Object.entries(appEvidence.workflow_runs ?? {})) {
      assert.equal(run.conclusion, "success", `Blocked: ${workflow} is not SUCCESS in the pinned QA evidence.`);
      assert.equal(run.head_sha, testedQaSha, `Blocked: ${workflow} did not test the pinned QA SHA.`);
    }
    for (let number = 1; number <= 13; number += 1) {
      const evidence = getApplicationTest(appEvidence.application_tests ?? {}, number);
      assert.ok(evidence === "PASS" || evidence?.status === "PASS",
        `Blocked: APP-${String(number).padStart(2, "0")} is not PASS in the pinned QA evidence.`);
    }
    const app15 = getApplicationTest(appEvidence.application_tests ?? {}, 15);
    assert.ok(app15 === "PASS" || app15?.status === "PASS",
      "Blocked: APP-15 is not PASS in the pinned QA evidence.");
    const app12 = getApplicationTest(appEvidence.application_tests ?? {}, 12);
    assert.ok(app12?.status === "PASS"
      && typeof app12.provider_delivery_observed === "string"
      && app12.provider_delivery_observed.startsWith("PASS"),
    "Blocked: APP-12 provider delivery is not PASS in the pinned QA evidence.");

    execFileSync("git", ["merge-base", "--is-ancestor", testedQaSha, expectedCommitSha], { stdio: "ignore" });
    const testedManifest = JSON.parse(execFileSync("git", [
      "show", `${testedQaSha}:supabase/rebuild/production-migration-cutover-freeze-20261105.json`,
    ], { encoding: "utf8" }));
    assert.deepEqual(frozenManifestPayload(manifest), frozenManifestPayload(testedManifest),
      "Blocked: frozen migration sequence, live ledger, hashes or postflight contract changed after QA; only review/approval metadata may change.");
    const laterChanges = splitChangedPaths(execFileSync("git", ["diff", "--name-only", testedQaSha + ".." + expectedCommitSha], { encoding: "utf8" }));
    const allowedPostQaChange = (path) => path.startsWith("docs/")
      || path === "supabase/rebuild/qa-final-collaudo-20261105.json"
      || path === "supabase/rebuild/production-ledger-20261105.json"
      || path === "supabase/rebuild/live-migration-ledgers-20261105.json"
      || path === "scripts/apply-reviewed-production-migrations.mjs"
      || path === "scripts/verify-release-readiness.mjs"
      || path === "scripts/lib/release-readiness-utils.mjs"
      || path === "scripts/test-release-readiness-utils.mjs"
      || path === "scripts/test-canonical-cutover-runner.mjs"
      || path === "scripts/verify-canonical-cutover-runner.mjs"
      || path === "scripts/verify-environment-migration-alignment.mjs"
      || path === "supabase/rebuild/production-migration-cutover-freeze-20261105.json";
    const unexpectedPostQaChanges = laterChanges.filter((path) => !allowedPostQaChange(path));
    assert.deepEqual(unexpectedPostQaChanges, [],
      "Blocked: application, migration, workflow or other non-documentation files changed after the tested QA SHA: " + unexpectedPostQaChanges.join(", "));
  }
  const isExpectedProductionTarget =
    (targetHost === `db.${projectRef}.supabase.co` && targetUser === "postgres")
    || (targetHost?.endsWith(".pooler.supabase.com") && targetUser === `postgres.${projectRef}`);

  if (rehearsal) {
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(targetHost),
      "Blocked: rehearsal mode is restricted to a local PostgreSQL host.");
    assert.ok(!process.env.BETHAG_ALLOW_PRODUCTION_MIGRATIONS && !process.env.BETHAG_PRODUCTION_PROJECT_REF,
      "Blocked: rehearsal mode must not be combined with Production authorization variables.");
    console.log("REHEARSAL MODE: local PostgreSQL only; Production credentials/authorization are not accepted.");
  } else if (preflightOnly) {
    assert.equal(process.env.BETHAG_PRODUCTION_PROJECT_REF, projectRef,
      `Blocked: BETHAG_PRODUCTION_PROJECT_REF must explicitly equal ${projectRef}.`);
    assert.ok(isExpectedProductionTarget && targetDatabase === "postgres",
      "Blocked: read-only preflight requires the expected Production host, username, and postgres database.");
    if (manifest.status === "FROZEN_FOR_REVIEW_APPROVED") {
      const calculatedFingerprint = await calculateReleaseFingerprint(manifest, approvedSourceCommitSha);
      assertFinalApprovalRecord(manifest, approvedSourceCommitSha, calculatedFingerprint);
    } else {
      assert.equal(manifest.status, "FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING",
        "Read-only preflight requires a pending or exactly approved frozen manifest.");
    }
    console.log("READ-ONLY PREFLIGHT MODE: Production ledger and frozen SQL hashes only; no DDL/DML is permitted.");
  } else {
    assert.equal(process.env.BETHAG_ALLOW_PRODUCTION_MIGRATIONS, "YES",
      "Blocked: set BETHAG_ALLOW_PRODUCTION_MIGRATIONS=YES only after formal cutover approval.");
    assert.equal(process.env.BETHAG_PRODUCTION_PROJECT_REF, projectRef,
      `Blocked: BETHAG_PRODUCTION_PROJECT_REF must explicitly equal ${projectRef}.`);
    assert.ok(isExpectedProductionTarget && targetDatabase === "postgres",
      "Blocked: Production apply mode requires the expected Production host, username, and postgres database.");
    assert.equal(process.env.BETHAG_CUTOVER_PLAN_APPROVED, "YES",
      "Blocked: the exact cutover plan, maintenance window, communications and rollback procedure are not approved.");
    const calculatedFingerprint = await calculateReleaseFingerprint(manifest, approvedSourceCommitSha);
    assertFinalApprovalRecord(manifest, approvedSourceCommitSha, calculatedFingerprint);
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
    const riskReconfirmedForThisCutover =
      process.env.BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED === "YES";
    assert.ok(physicalRestoreVerified || (riskAccepted && riskReconfirmedForThisCutover),
      "Blocked: verify a current provider physical restore OR explicitly reconfirm the documented residual physical-restore risk for this exact cutover by setting BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED=YES locally.");
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  assert.ok(
    ["FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING", "FROZEN_FOR_REVIEW_APPROVED"].includes(manifest.status),
    "Manifest status must be pending or formally approved; review the plan before proceeding.",
  );
  if (!rehearsal && !preflightOnly) {
    assert.equal(manifest.status, "FROZEN_FOR_REVIEW_APPROVED",
      "Production apply requires the manifest to record final cutover approval.");
  }
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

  if (preflightOnly) {
    console.log(JSON.stringify({
      status: "READ_ONLY_PRODUCTION_PREFLIGHT_PASS",
      target: "production",
      production_project_ref: projectRef,
      preserved_historical_rows: expectedLedgerCount,
      canonical_incremental_rows_reviewed: migrationBodies.length,
      final_ledger_count_before_cutover: initial.length,
      current_head: initial.at(-1),
      note: "Read-only verification complete. No SQL migration body was executed and no ledger row was written.",
    }, null, 2));
    return;
  }

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
