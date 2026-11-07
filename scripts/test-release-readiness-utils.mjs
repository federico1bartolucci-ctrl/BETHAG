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

test("frozen cutover manifest permits approval metadata changes but protects technical and review disposition", () => {
  const reviewed = {
    status: "FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING",
    safety: "Preserve all 248 Production rows and require guarded preflight.",
    user_authorization: { status: "NOT_RECEIVED", approved_commit_sha: null, approved_migration_hashes: [] },
    review_disposition: { status: "NOT_RECORDED", blocking_for_release: true },
    sequence: [{ file: "001_migration.sql", git_blob_sha: "abc" }],
    live_ledger: { rows: 248 },
    expected_postflight: { ledger_rows: 267 },
  };
  const metadataOnly = {
    ...reviewed,
    status: "FROZEN_FOR_REVIEW_APPROVED",
    safety: "Updated owner-facing execution summary; executable gates remain enforced by the runner.",
    no_go_gates: ["Updated operational checklist; executable gates remain enforced by the runner."],
    critical_execution_constraint: { status: "OWNER_FINAL_EXECUTION_SHA_APPROVAL_PENDING", rule: "Preserve the 248-row ledger." },
    live_catalog: {
      supabase_admin_default_acl_disposition: {
        qa_only_system_schema_default_acl: {
          exposure_status: "VERIFIED_NOT_EXPOSED",
          note: "Owner verified the Data API configuration in Production Dashboard.",
          exposure_evidence: { verified_date: "2026-11-07", private_exposed: false },
          role_level_override: { effective_dashboard_data_api_config: "VERIFIED_BY_OWNER_IN_PRODUCTION_DASHBOARD_2026-11-07" },
        },
      },
    },
    user_authorization: { status: "RECEIVED", approved_commit_sha: "a".repeat(40), approved_migration_hashes: [{ file: "001_migration.sql", git_blob_sha: "abc" }] },
    review_disposition: { status: "NOT_RECORDED", blocking_for_release: true },
  };
  assert.deepEqual(frozenManifestPayload(metadataOnly), frozenManifestPayload(reviewed));
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, review_disposition: { status: "BLOCKED", blocking_for_release: true } }),
    frozenManifestPayload(reviewed),
  );
  // Operational approval summaries, NO-GO checklist wording and owner-recorded
  // Dashboard evidence may evolve after QA. The executable gates and immutable
  // migration/live-ledger/postflight payload remain independently enforced.
  assert.deepEqual(frozenManifestPayload(metadataOnly), frozenManifestPayload(reviewed));
  assert.notDeepEqual(
    frozenManifestPayload({ ...metadataOnly, review_disposition: { status: "BLOCKED", blocking_for_release: true } }),
    frozenManifestPayload(reviewed),
  );
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


test("release fingerprint ignores approval metadata and registration commit identity", async () => {
  const { releaseFingerprint } = await import("./lib/release-readiness-utils.mjs");
  const manifest = {
    status: "FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING",
    user_authorization: { status: "PENDING", approved_by: null },
    sequence: Array.from({ length: 19 }, (_, i) => ({
      file: String(i).padStart(14, "0") + "_migration_" + i + ".sql",
      git_blob_sha: "a".repeat(40),
    })),
    live_ledger: { rows: 248 },
  };
  const files = {
    "scripts/runner.mjs": "runner\n",
    "supabase/preflight.sql": "SELECT 1;\n",
  };
  const first = releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest, fileContents: files });
  const approved = {
    ...manifest,
    status: "FROZEN_FOR_REVIEW_APPROVED",
    user_authorization: {
      status: "RECEIVED", approved_by: "owner", approved_execution_commit_sha: "c".repeat(40),
      approved_release_fingerprint: first,
    },
  };
  assert.equal(releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest: approved, fileContents: files }), first);
});

test("release fingerprint changes for critical runner, SQL, workflow and pre/postflight content", async () => {
  const { releaseFingerprint } = await import("./lib/release-readiness-utils.mjs");
  const manifest = {
    sequence: Array.from({ length: 19 }, (_, i) => ({
      file: String(i).padStart(14, "0") + "_migration_" + i + ".sql",
      git_blob_sha: "a".repeat(40),
    })),
    live_ledger: { rows: 248 },
  };
  const files = {
    "scripts/runner.mjs": "runner\n",
    ".github/workflows/build.yml": "build\n",
    ".github/workflows/final-qa-collaudo.yml": "qa\n",
    "supabase/preflight.sql": "SELECT 1;\n",
    "supabase/postflight.sql": "SELECT 2;\n",
  };
  const baseline = releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest, fileContents: files });
  for (const path of Object.keys(files)) {
    const changed = { ...files, [path]: files[path] + "-- changed\n" };
    assert.notEqual(releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest, fileContents: changed }), baseline, path);
  }
});

test("release fingerprint preserves migration order and source QA identity", async () => {
  const { releaseFingerprint } = await import("./lib/release-readiness-utils.mjs");
  const sequence = Array.from({ length: 19 }, (_, i) => ({
    file: String(i).padStart(14, "0") + "_migration_" + i + ".sql",
    git_blob_sha: String(i).padStart(40, "0"),
  }));
  const manifest = { sequence, live_ledger: { rows: 248 } };
  const files = { "scripts/runner.mjs": "runner\n" };
  const baseline = releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest, fileContents: files });
  const reordered = { ...manifest, sequence: [...sequence].reverse() };
  assert.notEqual(releaseFingerprint({ sourceCommitSha: "b".repeat(40), manifest: reordered, fileContents: files }), baseline);
  assert.notEqual(releaseFingerprint({ sourceCommitSha: "c".repeat(40), manifest, fileContents: files }), baseline);
});
