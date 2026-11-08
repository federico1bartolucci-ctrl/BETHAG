import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const host = process.env.PGHOST || "";
const port = process.env.PGPORT || "";
const user = process.env.PGUSER || "";
const database = process.env.PGDATABASE || "";
assert.ok(["localhost", "127.0.0.1", "::1"].includes(host), "Refusing non-loopback PostgreSQL host.");
assert.equal(port, "5432", "Expected disposable PostgreSQL port 5432.");
assert.equal(user, "postgres", "Expected disposable postgres role.");
assert.equal(database, "bethag_first_workspace_test", "Refusing to run outside the dedicated disposable test database.");

function psql(sql) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", sql], {
    encoding: "utf8",
    env: process.env,
  }).trim();
}

const setup = `
DO $roles$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $roles$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE public.workspaces(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workspace_members(
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE public.profiles(
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text,
  active boolean,
  updated_at timestamptz
);
CREATE OR REPLACE FUNCTION private.claim_first_workspace_admin(uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT gen_random_uuid() $$;
CREATE OR REPLACE FUNCTION public.claim_first_workspace_admin(uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER AS $$ SELECT private.claim_first_workspace_admin($1) $$;
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.profiles(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
GRANT USAGE ON SCHEMA public, private TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspaces, public.workspace_members, public.profiles TO authenticated;
`;
psql(setup);
const migration = await readFile("supabase/rebuild/drafts/20261108143000_secure_first_workspace_bootstrap.sql", "utf8");
psql(migration);

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const asA = (body) => `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '${userA}'; ${body}; COMMIT;`;
const asB = (body) => `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '${userB}'; ${body}; COMMIT;`;
const first = psql(asA("SELECT public.create_first_workspace_for_authenticated_admin('Studio Test A')"));
assert.match(first, /^[0-9a-f-]{36}$/i, "First authenticated user should create a workspace.");
const repeated = psql(asA("SELECT public.create_first_workspace_for_authenticated_admin('Nome diverso')"));
assert.equal(repeated, first, "Repeated bootstrap must return the same owner-bound workspace.");
const second = psql(asB("SELECT public.create_first_workspace_for_authenticated_admin('Studio Test B')"));
assert.match(second, /^[0-9a-f-]{36}$/i);
assert.notEqual(second, first, "A second user must receive a separate workspace, never claim the first.");
const owner = psql(`SELECT created_by_user_id::text FROM public.workspaces WHERE id='${first}'`);
assert.equal(owner, userA);
const membership = psql(`SELECT role FROM public.workspace_members WHERE workspace_id='${first}' AND user_id='${userA}'`);
assert.equal(membership, "admin");
const oldPrivate = psql("SELECT has_function_privilege('authenticated','private.claim_first_workspace_admin(uuid)','EXECUTE')");
const oldPublic = psql("SELECT has_function_privilege('authenticated','public.claim_first_workspace_admin(uuid)','EXECUTE')");
assert.equal(oldPrivate, "f", "Authenticated must not execute the unsafe private legacy endpoint.");
assert.equal(oldPublic, "f", "Authenticated must not execute the unsafe public legacy wrapper.");
const anonNew = psql("SELECT has_function_privilege('anon','public.create_first_workspace_for_authenticated_admin(text)','EXECUTE')");
assert.equal(anonNew, "f", "Anonymous role must not execute the new bootstrap.");
console.log(JSON.stringify({ result: "PASS", first_workspace: first, second_workspace: second, repeat_is_idempotent: true, legacy_claim_revoked: true, anon_denied: true }, null, 2));
