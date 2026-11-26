import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to the disposable PostgreSQL 17 clean-install database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Refusing non-local DATABASE_URL.");
assert.ok(!/supabase\.co|jhuyhlzzydcgghrzeexn/i.test(databaseUrl), "Remote Supabase URLs are refused.");

const indexSource = await readFile(
  "supabase/migrations/20261017000002_bethag_baseline_indexes_views.sql",
  "utf8",
);
assert.match(
  indexSource,
  /CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique[\s\S]*?ON public\.workspace_members[\s\S]*?\(workspace_id, legacy_id\)[\s\S]*?WHERE \(legacy_id IS NOT NULL\)/,
  "the canonical baseline must own the workspace legacy identity unique index",
);

const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userOne = randomUUID();
const userTwo = randomUUID();
const userThree = randomUUID();
const userFour = randomUUID();
const userFive = randomUUID();
const emailOne = "collaborator-legacy-one-" + userOne + "@example.invalid";
const emailTwo = "collaborator-legacy-two-" + userTwo + "@example.invalid";
const emailThree = "collaborator-legacy-three-" + userThree + "@example.invalid";
const emailFour = "collaborator-legacy-four-" + userFour + "@example.invalid";
const emailFive = "collaborator-legacy-five-" + userFive + "@example.invalid";
const legacyId = Math.floor(Date.now() / 1000) + 700000;

const sql = `
BEGIN;
DO $test$
BEGIN
  IF to_regclass('public.workspace_members_workspace_legacy_unique') IS NULL THEN
    RAISE EXCEPTION 'CANONICAL_WORKSPACE_MEMBER_LEGACY_UNIQUE_INDEX_MISSING';
  END IF;
END;
$test$;

INSERT INTO public.workspaces(id,name,plan)
VALUES
  ('${workspaceId}','Collaborator legacy conflict regression','free'),
  ('${otherWorkspaceId}','Other workspace for legacy identity scope','free');
INSERT INTO auth.users(id,email) VALUES
  ('${userOne}','${emailOne}'),
  ('${userTwo}','${emailTwo}'),
  ('${userThree}','${emailThree}'),
  ('${userFour}','${emailFour}'),
  ('${userFive}','${emailFive}');
INSERT INTO public.profiles(id,full_name,email,role,active) VALUES
  ('${userOne}','Collaborator One','${emailOne}','collaborator',true),
  ('${userTwo}','Collaborator Two','${emailTwo}','collaborator',true),
  ('${userThree}','Collaborator Three','${emailThree}','collaborator',true),
  ('${userFour}','Collaborator Four','${emailFour}','collaborator',true),
  ('${userFive}','Collaborator Five','${emailFive}','collaborator',true);

INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
VALUES ('${workspaceId}','${userOne}','collaborator',true,'{}'::jsonb,${legacyId});

-- The second Auth user/profile exists before the membership write loses the
-- canonical unique-index race, reproducing the orphan left by the old handler.
DO $test$
DECLARE constraint_name text;
BEGIN
  BEGIN
    INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
    VALUES ('${workspaceId}','${userTwo}','collaborator',true,'{}'::jsonb,${legacyId});
    RAISE EXCEPTION 'EXPECTED_DUPLICATE_LEGACY_ID_REJECTION';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS constraint_name = CONSTRAINT_NAME;
    IF constraint_name <> 'workspace_members_workspace_legacy_unique' THEN RAISE; END IF;
  END;
END;
$test$;

DO $test$
DECLARE auth_count integer; profile_count integer; member_count integer;
BEGIN
  SELECT count(*) INTO auth_count FROM auth.users WHERE id = '${userTwo}';
  SELECT count(*) INTO profile_count FROM public.profiles WHERE id = '${userTwo}';
  SELECT count(*) INTO member_count FROM public.workspace_members WHERE workspace_id = '${workspaceId}' AND user_id = '${userTwo}';
  IF auth_count <> 1 OR profile_count <> 1 OR member_count <> 0 THEN
    RAISE EXCEPTION 'LEGACY_CONFLICT_ORPHAN_REPRODUCTION_FAILED';
  END IF;
END;
$test$;

DELETE FROM auth.users WHERE id = '${userTwo}';
DO $test$
DECLARE auth_count integer; profile_count integer;
BEGIN
  SELECT count(*) INTO auth_count FROM auth.users WHERE id = '${userTwo}';
  SELECT count(*) INTO profile_count FROM public.profiles WHERE id = '${userTwo}';
  IF auth_count <> 0 OR profile_count <> 0 THEN
    RAISE EXCEPTION 'AUTH_USER_CLEANUP_DID_NOT_CASCADE_TO_PROFILE';
  END IF;
END;
$test$;

-- The unique identity is scoped to a workspace; NULL legacy IDs are not claims.
INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
VALUES
  ('${otherWorkspaceId}','${userThree}','collaborator',true,'{}'::jsonb,${legacyId}),
  ('${workspaceId}','${userFour}','collaborator',true,'{}'::jsonb,NULL),
  ('${workspaceId}','${userFive}','collaborator',true,'{}'::jsonb,NULL);

ROLLBACK;
`;

execFileSync(
  "psql",
  ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
console.log("PASS PostgreSQL 17: canonical workspace legacy unique index rejects the second membership; Auth/profile orphan reproduced and Auth deletion cascades cleanup; workspace and NULL scope preserved; transaction rolled back.");
