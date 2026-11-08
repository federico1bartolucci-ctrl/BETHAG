import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URL refused");

const migration = await readFile(
  "supabase/rebuild/drafts/20261105030000_reconcile_postgres_public_function_sequence_default_acl.sql",
  "utf8"
);
const setup = `BEGIN;
DO $roles$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $roles$;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT ON SEQUENCES TO service_role;
CREATE TEMP TABLE admin_function_acl AS
  SELECT defaclacl::text AS acl FROM pg_default_acl
  WHERE defaclrole='supabase_admin'::regrole AND defaclnamespace='public'::regnamespace AND defaclobjtype='f';
CREATE TEMP TABLE admin_sequence_acl AS
  SELECT defaclacl::text AS acl FROM pg_default_acl
  WHERE defaclrole='supabase_admin'::regrole AND defaclnamespace='public'::regnamespace AND defaclobjtype='S';`;
const verify = `
DO $assert$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole);
  IF v_count<>0 THEN RAISE EXCEPTION 'Application function/sequence defaults remain: %',v_count; END IF;

  SELECT count(*) INTO v_count
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace=0
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole);
  IF v_count<>0 THEN RAISE EXCEPTION 'Global application defaults unexpectedly present: %',v_count; END IF;

  IF (SELECT count(*) FROM admin_function_acl)<>(SELECT count(*) FROM pg_default_acl d
      WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclnamespace='public'::regnamespace
        AND d.defaclobjtype='f' AND d.defaclacl::text=(SELECT acl FROM admin_function_acl)) THEN
    RAISE EXCEPTION 'supabase_admin function defaults changed';
  END IF;
  IF (SELECT count(*) FROM admin_sequence_acl)<>(SELECT count(*) FROM pg_default_acl d
      WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclnamespace='public'::regnamespace
        AND d.defaclobjtype='S' AND d.defaclacl::text=(SELECT acl FROM admin_sequence_acl)) THEN
    RAISE EXCEPTION 'supabase_admin sequence defaults changed';
  END IF;
END $assert$;
ROLLBACK;`;

execFileSync("psql", [
  "-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1",
  "-c", setup + "\n" + migration + "\n" + migration + "\n" + verify
], { stdio: "inherit" });

console.log(JSON.stringify({
  status: "PASS",
  postgres: 17,
  scenario: "historical service_role function/sequence default grants",
  future_functions: "owner-only; explicit per-function grants required",
  future_sequences: "owner-only; explicit per-sequence grants required",
  supabase_admin: "unchanged",
  idempotency: "draft applied twice",
  transaction: "rolled back",
  remote_databases_touched: false
}, null, 2));
