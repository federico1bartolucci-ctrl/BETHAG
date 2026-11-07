import test from "node:test";
import assert from "node:assert/strict";
import { gitBlobSha, hasPostgresConnectionConfig, splitChangedPaths, getApplicationTest, frozenManifestPayload, isFreshSnapshot } from "./lib/release-readiness-utils.mjs";

test("Git blob hash is identical for LF and CRLF checkout content", () => {
  const lf = "SELECT 1;\nSELECT 2;\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.equal(gitBlobSha(crlf), gitBlobSha(lf));
});

test("Git blob hash still detects SQL content changes", () => {
  assert.notEqual(gitBlobSha("SELECT 1;\n"), gitBlobSha("SELECT 2;\n"));
});

test("changed-path parser handles LF and CRLF output", () => {
  assert.deepEqual(splitChangedPaths("docs/a.md\nscripts/b.mjs\n"), ["docs/a.md", "scripts/b.mjs"]);
  assert.deepEqual(splitChangedPaths("docs/a.md\r\nscripts/b.mjs\r\n"), ["docs/a.md", "scripts/b.mjs"]);
  assert.deepEqual(splitChangedPaths(""), []);
});

test("connection gate accepts DATABASE_URL", () => {
  assert.equal(hasPostgresConnectionConfig({ DATABASE_URL: "postgresql://example" }), true);
});

test("connection gate accepts the runner's PGHOST/PGDATABASE/PGUSER tuple", () => {
  assert.equal(hasPostgresConnectionConfig({ PGHOST: "db.example", PGDATABASE: "postgres", PGUSER: "postgres" }), true);
});

test("connection gate rejects incomplete libpq configuration", () => {
  assert.equal(hasPostgresConnectionConfig({ PGHOST: "db.example", PGDATABASE: "postgres" }), false);
  assert.equal(hasPostgresConnectionConfig({}), false);
});

test("application evidence resolves canonical hyphenated APP keys", () => {
  const evidence = {
    "APP-12": { status: "PASS", provider_delivery_observed: "PASS — delivered" },
    "APP-14": { status: "PARTIAL" },
  };
  assert.equal(getApplicationTest(evidence, 12).status, "PASS");
  assert.equal(getApplicationTest(evidence, 14).status, "PARTIAL");
});

test("application evidence retains compatibility with legacy APP aliases", () => {
  const evidence = { APP15: { status: "PASS" } };
  assert.equal(getApplicationTest(evidence, 15).status, "PASS");
});

test("frozen cutover manifest permits review metadata changes but protects the technical payload", () => {
  const reviewed = {
    status: "FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING",
    safety: "historical safety note",
    user_authorization: { status: "NOT_RECEIVED", approved_commit_sha: null, approved_migration_hashes: [] },
    review_disposition: { status: "NOT_RECORDED", blocking_for_release: true },
    sequence: [{ file: "001_migration.sql", git_blob_sha: "abc" }],
    live_ledger: { rows: 248 },
    expected_postflight: { ledger_rows: 267 },
  };
  const metadataOnly = {
    ...reviewed,
    status: "FROZEN_FOR_REVIEW_APPROVED",
    safety: "approval recorded for exact release candidate",
    user_authorization: { status: "RECEIVED", approved_commit_sha: "a".repeat(40), approved_migration_hashes: [{ file: "001_migration.sql", git_blob_sha: "abc" }] },
    review_disposition: { status: "INTERNAL_REVIEW_ACCEPTED_AS_PROJECT_CONTROL", blocking_for_release: false },
  };
  assert.deepEqual(frozenManifestPayload(metadataOnly), frozenManifestPayload(reviewed));
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, sequence: [{ file: "001_migration.sql", git_blob_sha: "changed" }] }),
    frozenManifestPayload(reviewed),
  );
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, live_ledger: { rows: 249 } }),
    frozenManifestPayload(reviewed),
  );
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, expected_postflight: { ledger_rows: 268 } }),
    frozenManifestPayload(reviewed),
  );
  // Post-QA history/reconciliation sections are not implicit mutable metadata.
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, superseded_user_authorization: { status: "RECEIVED" } }),
    frozenManifestPayload(reviewed),
  );
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, current_release_reconciliation: { approval_state: "PENDING" } }),
    frozenManifestPayload(reviewed),
  );
});

test("live snapshot freshness accepts a current timestamp", () => {
  const now = Date.parse("2026-11-06T16:15:00Z");
  assert.equal(isFreshSnapshot("2026-11-06T16:00:00Z", now), true);
});

test("live snapshot freshness rejects stale, missing, invalid and future timestamps", () => {
  const now = Date.parse("2026-11-06T16:15:00Z");
  assert.equal(isFreshSnapshot("2026-11-05T15:14:59Z", now), false);
  assert.equal(isFreshSnapshot(undefined, now), false);
  assert.equal(isFreshSnapshot("not-a-date", now), false);
  assert.equal(isFreshSnapshot("2026-11-06T16:21:00Z", now), false);
});
