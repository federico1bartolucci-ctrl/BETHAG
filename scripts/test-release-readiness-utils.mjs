import test from "node:test";
import assert from "node:assert/strict";
import { gitBlobSha, hasPostgresConnectionConfig, splitChangedPaths } from "./lib/release-readiness-utils.mjs";

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
