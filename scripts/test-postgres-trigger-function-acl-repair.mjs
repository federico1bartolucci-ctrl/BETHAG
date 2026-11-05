import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.ok(!/supabase\\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URL refused");

const migration = await readFile(
  "supabase/rebuild/drafts/20261105020000_revoke_public_execute_from_public_trigger_functions.sql",
  "utf8"
);
const setup = `BEGIN;
DO $roles$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE OR REPLACE FUNCTION public.normalize_zero_ownership_owner()
RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RETURN NEW; END $fn$;
CREATE OR REPLACE FUNCTION public.preserve_closing_condominium_member_history()
RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RETURN NEW; END $fn$;
GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC, service_role;
GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC, service_role;`;
const verify = `
DO $assert$
DECLARE v_oid oid; v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'public.normalize_zero_ownership_owner()',
    'public.preserve_closing_condominium_member_history()'
  ] LOOP
    v_oid := to_regprocedure(v_name);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'missing %', v_name; END IF;
    IF (SELECT prorettype FROM pg_proc WHERE oid=v_oid) <> 'trigger'::regtype THEN
      RAISE EXCEPTION '% must remain a trigger function', v_name;
    END IF;
    IF (SELECT prosecdef FROM pg_proc WHERE oid=v_oid) THEN
      RAISE EXCEPTION '% unexpectedly SECURITY DEFINER', v_name;
    END IF;
    IF has_function_privilege('anon',v_oid,'EXECUTE')
       OR has_function_privilege('authenticated',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION 'anon/authenticated EXECUTE remains on %', v_name;
    END IF;
    IF NOT has_function_privilege('service_role',v_oid,'EXECUTE')
       OR NOT has_function_privilege('postgres',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION 'service_role/owner EXECUTE was not preserved on %', v_name;
    END IF;
  END LOOP;
END $assert$;
ROLLBACK;`;

execFileSync("psql", [
  "-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1",
  "-c", setup + "\n" + migration + "\n" + migration + "\n" + verify
], { stdio: "inherit" });

console.log(JSON.stringify({
  status: "PASS",
  postgres: 17,
  scenario: "Production trigger-function ACL drift",
  functions: ["normalize_zero_ownership_owner()", "preserve_closing_condominium_member_history()"],
  public_anon_authenticated_execute: "none",
  owner_execute: "preserved",
  service_role_execute: "preserved",
  idempotency: "draft applied twice",
  transaction: "rolled back",
  remote_databases_touched: false
}, null, 2));
