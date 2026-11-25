import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to the disposable PostgreSQL 17 clean-install database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Refusing non-local DATABASE_URL.");
assert.ok(!/supabase\\.co|jhuyhlzzydcgghrzeexn/i.test(databaseUrl), "Remote Supabase URLs are refused.");

const migration = await readFile(
  "supabase/rebuild/proposed-forward-migrations/20261125154500_enforce_workspace_member_legacy_id_uniqueness.sql",
  "utf8",
);

const workspaceId = randomUUID();
const userOne = randomUUID();
const userTwo = randomUUID();
const userThree = randomUUID();
const userFour = randomUUID();
const emailOne = "collaborator-legacy-one-" + userOne + "@example.invalid";
const emailTwo = "collaborator-legacy-two-" + userTwo + "@example.invalid";
const emailThree = "collaborator-legacy-three-" + userThree + "@example.invalid";
const emailFour = "collaborator-legacy-four-" + userFour + "@example.invalid";
const legacyId = Math.floor(Date.now() / 1000) + 700000;

const sql = `
BEGIN;
DO $test$
BEGIN
  IF to_regclass('public.workspace_members_workspace_legacy_id_uidx') IS NOT NULL THEN
    RAISE EXCEPTION 'Candidate index unexpectedly exists before this isolated regression.';
  END IF;
END;
$test$;

INSERT INTO public.workspaces(id,name,plan)
VALUES ('${workspaceId}','Collaborator legacy ID uniqueness regression','free');
INSERT INTO auth.users(id,email) VALUES
  ('${userOne}','${emailOne}'),
  ('${userTwo}','${emailTwo}'),
  ('${userThree}','${emailThree}'),
  ('${userFour}','${emailFour}');
INSERT INTO public.profiles(id,full_name,email,role,active) VALUES
  ('${userOne}','Collaborator One','${emailOne}','collaborator',true),
  ('${userTwo}','Collaborator Two','${emailTwo}','collaborator',true),
  ('${userThree}','Collaborator Three','${emailThree}','collaborator',true),
  ('${userFour}','Collaborator Four','${emailFour}','collaborator',true);

-- Baseline reproduction: the primary key is (workspace_id,user_id), so two
-- different Auth users can claim the same workspace legacy_id.
INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id) VALUES
  ('${workspaceId}','${userOne}','collaborator',true,'{}'::jsonb,${legacyId}),
  ('${workspaceId}','${userTwo}','collaborator',true,'{}'::jsonb,${legacyId});
DO $test$
DECLARE row_count integer;
BEGIN
  SELECT count(*) INTO row_count
  FROM public.workspace_members
  WHERE workspace_id = '${workspaceId}' AND legacy_id = ${legacyId};
  IF row_count <> 2 THEN RAISE EXCEPTION 'LEGACY_DUPLICATE_BASELINE_NOT_REPRODUCED'; END IF;
END;
$test$;
DELETE FROM public.workspace_members
WHERE workspace_id = '${workspaceId}' AND legacy_id = ${legacyId};

${migration}

INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
VALUES ('${workspaceId}','${userOne}','collaborator',true,'{}'::jsonb,${legacyId});

DO $test$
DECLARE constraint_name text;
BEGIN
  BEGIN
    INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
    VALUES ('${workspaceId}','${userTwo}','collaborator',true,'{}'::jsonb,${legacyId});
    RAISE EXCEPTION 'EXPECTED_DUPLICATE_LEGACY_ID_REJECTION';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS constraint_name = CONSTRAINT_NAME;
    IF constraint_name <> 'workspace_members_workspace_legacy_id_uidx' THEN RAISE; END IF;
  END;
END;
$test$;

-- The partial index must not collide across workspaces or for NULL legacy IDs.
INSERT INTO public.workspaces(id,name,plan)
VALUES ('${randomUUID()}','Other workspace for legacy identity scope','free');
INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions,legacy_id)
VALUES
  ('${randomUUID()}','${userThree}','collaborator',true,'{}'::jsonb,${legacyId}),
  ('${workspaceId}','${userFour}','collaborator',true,'{}'::jsonb,NULL);

ROLLBACK;
`;

execFileSync(
  "psql",
  ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
assert.ok(sql.includes("WORKSPACE_MEMBER_LEGACY_ID_DUPLICATES_EXIST"));
console.log("PASS PostgreSQL 17: baseline duplicate collaborator legacy IDs reproduced; candidate unique index rejects the second user; workspace scope and NULL compatibility preserved; transaction rolled back.");
