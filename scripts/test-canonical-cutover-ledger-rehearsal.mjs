import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must be set to the isolated PostgreSQL test database.");
assert.match(databaseUrl, /^postgres(?:ql)?:\/\//, "DATABASE_URL must be a PostgreSQL connection URL.");
assert.ok(!/tctcgptrsmvgajqjgnev|supabase\.co/i.test(databaseUrl),
  "Refusing to run the rehearsal against a Supabase/Production URL.");

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [
      "-X", "--no-psqlrc", "--dbname", databaseUrl,
      "-v", "ON_ERROR_STOP=1", "-At"
    ], { env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout.trim())
      : reject(new Error(`psql failed (exit ${code}): ${stderr || stdout}`)));
    child.stdin.end(sql);
  });
}

const sql = `
BEGIN;
CREATE TEMP TABLE cutover_ledger_rehearsal (
  version text PRIMARY KEY,
  name text NOT NULL,
  statements text[] NOT NULL,
  created_by text,
  idempotency_key text
) ON COMMIT DROP;

INSERT INTO cutover_ledger_rehearsal(version,name,statements,created_by,idempotency_key)
SELECT to_char( date '2026-01-01' + n, 'YYYYMMDD') || lpad(n::text, 6, '0'),
       'historical_' || n, ARRAY['SELECT 1;'], 'fixture', NULL
FROM generate_series(1,244) AS n;

CREATE TEMP TABLE cutover_ledger_snapshot AS
SELECT version,name FROM cutover_ledger_rehearsal ORDER BY version;

DO $test$
DECLARE n integer;
BEGIN
  FOR n IN 1..11 LOOP
    INSERT INTO cutover_ledger_rehearsal(version,name,statements,created_by,idempotency_key)
    VALUES ('20261027' || lpad(n::text,6,'0'),
            'canonical_migration_' || n,
            ARRAY['SELECT 1;'],
            'bethag-reviewed-cutover',
            NULL);
  END LOOP;
  IF (SELECT count(*) FROM cutover_ledger_rehearsal) <> 255 THEN
    RAISE EXCEPTION 'Expected 255 rows after rehearsal inserts';
  END IF;
  IF EXISTS (
    (SELECT version,name FROM cutover_ledger_snapshot ORDER BY version)
    EXCEPT
    (SELECT version,name FROM cutover_ledger_rehearsal WHERE name LIKE 'historical_%' ORDER BY version)
  ) THEN
    RAISE EXCEPTION 'Historical ledger pairs changed during rehearsal';
  END IF;
END
$test$;

SELECT 'PASS: DATABASE_URL reached PostgreSQL; transaction accepted 11 canonical-style rows and preserved all 244 historical fixture rows';
ROLLBACK;
`;

const result = await runPsql(sql);
assert.match(result, /PASS: DATABASE_URL reached PostgreSQL/);
console.log(JSON.stringify({
  status: "PASS",
  test: "isolated canonical-ledger transaction rehearsal",
  connection: "psql received DATABASE_URL through --dbname",
  historical_fixture_rows_preserved: 244,
  canonical_style_rows_inserted_inside_transaction: 11,
  transaction_rolled_back: true,
  production_or_supabase_touched: false
}, null, 2));
