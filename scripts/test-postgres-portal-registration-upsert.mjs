import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL is required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only isolated local PostgreSQL is allowed");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URLs are refused");

const migration = await readFile("supabase/rebuild/drafts/20261105050000_reconcile_portal_registration_upsert.sql", "utf8");
const canonicalMigration = await readFile("supabase/migrations/20261105050000_reconcile_portal_registration_upsert.sql", "utf8");
assert.equal(canonicalMigration, migration, "Draft and canonical portal registration migration payloads must be byte-identical");
execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1", "-c", migration], {
  stdio: "inherit",
});

const sql = `
BEGIN;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

-- Synthetic administrator and resident identities, all rolled back at the end.
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('10000000-0000-0000-0000-000000000001','admin-portal-test@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000002','admin-approved@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000003','self-registered@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000004','unmatched-resident@example.invalid',now());

INSERT INTO public.profiles(id,full_name,email,role,active) VALUES
 ('10000000-0000-0000-0000-000000000001','QA Portal Admin','admin-portal-test@example.invalid','admin',true),
 ('10000000-0000-0000-0000-000000000002','Approved Resident','admin-approved@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000003','Self Registered Resident','self-registered@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000004','Unmatched Resident','unmatched-resident@example.invalid','resident',true);

INSERT INTO public.workspaces(id,name,plan)
VALUES ('20000000-0000-0000-0000-000000000001','Portal registration migration test','free'),
 ('20000000-0000-0000-0000-000000000002','Second portal registration workspace','free');

INSERT INTO public.condominiums(id,workspace_id,name)
VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Admin approval test condominium'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Self registration test condominium'),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Duplicate matching test condominium'),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','Archived condominium test'),
 ('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','Ambiguous shared name'),
 ('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000002','Ambiguous shared name');

INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','admin',true,'{}'::jsonb);

INSERT INTO public.condominium_members(id,condominium_id,user_id,name,email,role,active,legacy_id,data)
VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',NULL,'Approved Resident','admin-approved@example.invalid','resident',true,41001,'{"apartment":"A1"}'::jsonb),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',NULL,'Self Registered Resident','self-registered@example.invalid','resident',true,41002,'{"apartment":"B2"}'::jsonb),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',NULL,'Duplicate Match Resident','duplicate-match@example.invalid','resident',true,41003,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004',NULL,'Archived Resident','archived@example.invalid','resident',true,41004,'{}'::jsonb);

-- The archive guard allows the normal lifecycle transition from active to archived.
UPDATE public.condominiums SET archived_at=now()
WHERE id='30000000-0000-0000-0000-000000000004';

INSERT INTO public.portal_registration_requests(id,workspace_id,requested_user_id,email,full_name,status)
VALUES ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002','admin-approved@example.invalid','Approved Resident','pending');

-- Exercise the administrator approval path as authenticated. The function must call
-- the centralized helper and create exactly one matching portal access row.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SELECT private.admin_approve_portal_registration(
 '50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'
);
RESET ROLE;

DO $admin_assert$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_access
   WHERE workspace_id='20000000-0000-0000-0000-000000000001'
     AND condominium_id='30000000-0000-0000-0000-000000000001'
     AND member_id='40000000-0000-0000-0000-000000000001'
     AND lower(email)='admin-approved@example.invalid'
     AND permissions='[]'::jsonb
     AND active=true
 ) THEN RAISE EXCEPTION 'Admin approval did not upsert the expected portal access'; END IF;
 IF (SELECT status FROM public.portal_registration_requests WHERE id='50000000-0000-0000-0000-000000000001') <> 'approved'
 THEN RAISE EXCEPTION 'Admin approval did not mark the request approved'; END IF;
END;
$admin_assert$;

-- Exercise the self-registration path as the resident account itself.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
SELECT private.complete_portal_registration('Self Registered Resident',NULL,'Self registration test condominium');
RESET ROLE;

DO $resident_assert$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_access
   WHERE workspace_id='20000000-0000-0000-0000-000000000001'
     AND condominium_id='30000000-0000-0000-0000-000000000002'
     AND member_id='40000000-0000-0000-0000-000000000002'
     AND lower(email)='self-registered@example.invalid'
     AND permissions='["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb
     AND active=true
 ) THEN RAISE EXCEPTION 'Self-registration did not upsert the expected portal access'; END IF;
END;
$resident_assert$;

-- Duplicate condominium names across workspaces must never be routed arbitrarily.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
SELECT private.complete_portal_registration('Unmatched Resident',NULL,'Ambiguous shared name');
RESET ROLE;

DO $ambiguous_workspace_assert$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE requested_user_id='10000000-0000-0000-0000-000000000004'
     AND status='pending'
     AND workspace_id IS NULL
 ) THEN
   RAISE EXCEPTION 'Ambiguous condominium name was assigned to a workspace instead of remaining unassigned';
 END IF;
END;
$ambiguous_workspace_assert$;

-- A legacy-id match and an email match pointing to different rows must fail closed.
INSERT INTO public.portal_access(id,workspace_id,condominium_id,legacy_id,name,email,role,permissions,active)
VALUES
 ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003',41003,'Old duplicate row','old-duplicate@example.invalid','resident','[]'::jsonb,true),
 ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003',41099,'Email duplicate row','duplicate-match@example.invalid','resident','[]'::jsonb,true);

DO $duplicate_assert$
BEGIN
 BEGIN
   PERFORM private.upsert_portal_access_for_member(
     '20000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000003',
     'duplicate-match@example.invalid',
     '[]'::jsonb
   );
   RAISE EXCEPTION 'Expected PORTAL_ACCESS_CONFLICTING_DUPLICATE_ROWS';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_ACCESS_CONFLICTING_DUPLICATE_ROWS' THEN RAISE; END IF;
 END;
END;
$duplicate_assert$;

DO $archived_assert$
BEGIN
 BEGIN
   PERFORM private.upsert_portal_access_for_member(
     '20000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000004',
     'archived@example.invalid',
     '[]'::jsonb
   );
   RAISE EXCEPTION 'Expected PORTAL_CONDOMINIUM_WORKSPACE_MISMATCH';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_CONDOMINIUM_WORKSPACE_MISMATCH' THEN RAISE; END IF;
 END;
END;
$archived_assert$;

DO $acl_assert$
DECLARE
 v_helper oid := 'private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)'::regprocedure;
 v_admin oid := 'private.admin_approve_portal_registration(uuid,uuid)'::regprocedure;
 v_complete oid := 'private.complete_portal_registration(text,text,text)'::regprocedure;
BEGIN
 IF has_function_privilege('anon',v_helper,'EXECUTE')
    OR has_function_privilege('authenticated',v_helper,'EXECUTE')
    OR has_function_privilege('service_role',v_helper,'EXECUTE') THEN
   RAISE EXCEPTION 'Private portal upsert helper is exposed to application roles';
 END IF;
 IF NOT has_function_privilege('authenticated',v_admin,'EXECUTE')
    OR NOT has_function_privilege('authenticated',v_complete,'EXECUTE') THEN
   RAISE EXCEPTION 'Authenticated portal entry-point grants are missing';
 END IF;
 IF position('private.upsert_portal_access_for_member' IN pg_get_functiondef(v_admin))=0
    OR position('private.upsert_portal_access_for_member' IN pg_get_functiondef(v_complete))=0 THEN
   RAISE EXCEPTION 'Portal registration callers do not use the centralized helper';
 END IF;
END;
$acl_assert$;

SELECT 'PASS: portal registration helper, authenticated callers, duplicate conflict rejection and archived-condominium guard';
ROLLBACK;
`;
execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  stdio: "inherit",
});
console.log(JSON.stringify({
  status: "PASS",
  target: "isolated local PostgreSQL 17 clean-install database",
  checks: [
    "administrator portal approval uses centralized upsert helper",
    "resident self-registration uses centralized upsert helper",
    "legacy-id/email conflicting duplicates fail closed",
    "archived condominium portal upsert rejected",
    "helper inaccessible directly to anon/authenticated/service_role",
    "authenticated callers retain intended EXECUTE",
    "all synthetic data rolled back",
  ],
  remote_databases_touched: false,
}, null, 2));
