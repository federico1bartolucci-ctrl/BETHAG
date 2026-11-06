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
assert.match(migration, /LIMIT 1\s+FOR UPDATE;/,
  "Self-registration must lock the matched member row before checking/linking its user_id");
assert.match(migration, /WHERE id=p_member_id AND active=true\s+FOR UPDATE;/,
  "Administrator approval must lock the selected member row before checking/linking its user_id");
assert.match(migration, /PORTAL_CONDOMINIUM_AMBIGUOUS_WITHIN_WORKSPACE/,
  "Self-registration must reject same-name active condominiums inside one workspace");
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
 ('10000000-0000-0000-0000-000000000004','unmatched-resident@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000005','relink-attempt@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000006','workspace-two-admin@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000007','unrelated-workspace-admin@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000008','corrected-email@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000009','verified-account@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000010','unverified-account@example.invalid',NULL),
 ('10000000-0000-0000-0000-000000000011','same-workspace-duplicate@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000012','unique-duplicate-condo-resident@example.invalid',now());

INSERT INTO public.profiles(id,full_name,email,role,active) VALUES
 ('10000000-0000-0000-0000-000000000001','QA Portal Admin','admin-portal-test@example.invalid','admin',true),
 ('10000000-0000-0000-0000-000000000002','Approved Resident','admin-approved@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000003','Self Registered Resident','self-registered@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000004','Unmatched Resident','unmatched-resident@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000005','Relink Attempt','relink-attempt@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000006','Workspace Two Admin','workspace-two-admin@example.invalid','admin',true),
 ('10000000-0000-0000-0000-000000000007','Unrelated Workspace Admin','unrelated-workspace-admin@example.invalid','admin',true),
 ('10000000-0000-0000-0000-000000000008','Email Mismatch Resident','corrected-email@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000009','Account Email Mismatch Resident','verified-account@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000010','Unverified Resident','unverified-account@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000011','Same Workspace Duplicate Resident','same-workspace-duplicate@example.invalid','resident',true),
 ('10000000-0000-0000-0000-000000000012','Unique Duplicate Condo Resident','unique-duplicate-condo-resident@example.invalid','resident',true);

INSERT INTO public.workspaces(id,name,plan)
VALUES ('20000000-0000-0000-0000-000000000001','Portal registration migration test','free'),
 ('20000000-0000-0000-0000-000000000002','Second portal registration workspace','free'),
 ('20000000-0000-0000-0000-000000000003','Unrelated portal registration workspace','free');

INSERT INTO public.condominiums(id,workspace_id,name)
VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Admin approval test condominium'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Self registration test condominium'),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Duplicate matching test condominium'),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','Archived condominium test'),
 ('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','Ambiguous shared name'),
 ('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000002','Ambiguous shared name'),
 ('30000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002','Different condominium in workspace two'),
 ('30000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000001','Same Workspace Duplicate Name'),
 ('30000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000001','Same Workspace Duplicate Name');

INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions)
VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','admin',true,'{}'::jsonb),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000006','admin',true,'{}'::jsonb),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000007','admin',true,'{}'::jsonb);

INSERT INTO public.condominium_members(id,condominium_id,user_id,name,email,role,active,legacy_id,data)
VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',NULL,'Approved Resident','admin-approved@example.invalid','resident',true,41001,'{"apartment":"A1"}'::jsonb),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',NULL,'Self Registered Resident','self-registered@example.invalid','resident',true,41002,'{"apartment":"B2"}'::jsonb),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',NULL,'Duplicate Match Resident','duplicate-match@example.invalid','resident',true,41003,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004',NULL,'Archived Resident','archived@example.invalid','resident',true,41004,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001',NULL,'QA Portal Admin','admin-portal-test@example.invalid','resident',true,41005,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Already Linked Resident','already-linked@example.invalid','resident',true,41006,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000006',NULL,'Resident To Be Matched','unmatched-resident@example.invalid','resident',true,41007,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001',NULL,'Email Mismatch Resident','old-email@example.invalid','resident',true,41008,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001',NULL,'Account Email Mismatch Resident','request-email@example.invalid','resident',true,41009,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001',NULL,'Unverified Resident','unverified-account@example.invalid','resident',true,41010,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000007',NULL,'Wrong Condominium Resident','wrong-condo@example.invalid','resident',true,41011,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000008',NULL,'Same Workspace Duplicate Resident','same-workspace-duplicate@example.invalid','resident',true,41012,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000009',NULL,'Same Workspace Duplicate Resident','same-workspace-duplicate@example.invalid','resident',true,41013,'{}'::jsonb),
 ('40000000-0000-0000-0000-000000000014','30000000-0000-0000-0000-000000000008',NULL,'Unique Duplicate Condo Resident','unique-duplicate-condo-resident@example.invalid','resident',true,41014,'{}'::jsonb);

-- The archive guard allows the normal lifecycle transition from active to archived.
UPDATE public.condominiums SET archived_at=now()
WHERE id='30000000-0000-0000-0000-000000000004';

INSERT INTO public.portal_registration_requests(id,workspace_id,requested_user_id,email,full_name,status,matched_member_id)
VALUES ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002','admin-approved@example.invalid','Approved Resident','pending',NULL),
 ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000005','relink-attempt@example.invalid','Relink Attempt','pending',NULL),
 ('50000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000008','corrected-email@example.invalid','Email Mismatch Resident','email_mismatch',
 '40000000-0000-0000-0000-000000000008'),
 ('50000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000009','request-email@example.invalid','Account Email Mismatch Resident','pending',NULL),
 ('50000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000010','unverified-account@example.invalid','Unverified Resident','pending',NULL);

INSERT INTO public.portal_registration_requests(
 id,workspace_id,requested_user_id,email,full_name,condominium_name,status
)
VALUES (
 '50000000-0000-0000-0000-000000000007',
 NULL,
 '10000000-0000-0000-0000-000000000011',
 'same-workspace-duplicate@example.invalid',
 'Same Workspace Duplicate Resident',
 'Same Workspace Duplicate Name',
 'pending'
);

-- A second request from the same account must not be approved merely because
-- another condominium registration for that account is matched automatically.
INSERT INTO public.portal_registration_requests(
 id,workspace_id,requested_user_id,email,full_name,condominium_name,status
)
VALUES (
 '50000000-0000-0000-0000-000000000006',
 '20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000003',
 'self-registered@example.invalid',
 'Self Registered Resident',
 'Admin approval test condominium',
 'pending'
);

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

-- A manager outside the target workspace cannot probe or approve its request.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000007';
DO $unauthorized_approval$
BEGIN
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000003',
     '40000000-0000-0000-0000-000000000008'
   );
   RAISE EXCEPTION 'Expected workspace authorization denial';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Autorizzazione gestione Portale richiesta' THEN RAISE; END IF;
 END;
END;
$unauthorized_approval$;
RESET ROLE;

-- An email-mismatch request cannot be approved until the condominium member
-- email is corrected to the verified account email.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
DO $email_mismatch_guard$
BEGIN
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000003',
     '40000000-0000-0000-0000-000000000008'
   );
   RAISE EXCEPTION 'Expected MEMBER_EMAIL_MUST_BE_CORRECTED_BEFORE_APPROVAL';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'MEMBER_EMAIL_MUST_BE_CORRECTED_BEFORE_APPROVAL' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000003',
     '40000000-0000-0000-0000-000000000010'
   );
   RAISE EXCEPTION 'Expected MISMATCH_REQUEST_MUST_USE_ORIGINAL_MATCHED_MEMBER';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'MISMATCH_REQUEST_MUST_USE_ORIGINAL_MATCHED_MEMBER' THEN RAISE; END IF;
 END;
END;
$email_mismatch_guard$;
RESET ROLE;

DO $email_mismatch_state$
BEGIN
 IF (SELECT status FROM public.portal_registration_requests
     WHERE id='50000000-0000-0000-0000-000000000003') <> 'email_mismatch' THEN
   RAISE EXCEPTION 'Email-mismatch request changed status before member email correction';
 END IF;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000008') IS NOT NULL THEN
   RAISE EXCEPTION 'Email-mismatch approval linked the resident before correction';
 END IF;
END;
$email_mismatch_state$;

-- A verified account email must match the registration request, and an
-- unverified account must never be linked or granted portal access.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
DO $account_email_guard$
BEGIN
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000009'
   );
   RAISE EXCEPTION 'Expected ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH for account/request mismatch';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000010'
   );
   RAISE EXCEPTION 'Expected ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH for unverified account';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH' THEN RAISE; END IF;
 END;
END;
$account_email_guard$;
RESET ROLE;

DO $account_email_guard_state$
BEGIN
 IF (SELECT status FROM public.portal_registration_requests WHERE id='50000000-0000-0000-0000-000000000004') <> 'pending'
    OR (SELECT status FROM public.portal_registration_requests WHERE id='50000000-0000-0000-0000-000000000005') <> 'pending' THEN
   RAISE EXCEPTION 'Rejected account email approval changed request status';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.condominium_members
   WHERE id IN ('40000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000010')
     AND user_id IS NOT NULL
 ) OR EXISTS (
   SELECT 1 FROM public.portal_access
   WHERE member_id IN ('40000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000010')
 ) THEN
   RAISE EXCEPTION 'Rejected account email approval linked a member or created portal access';
 END IF;
END;
$account_email_guard_state$;


UPDATE public.condominium_members
SET email='corrected-email@example.invalid'
WHERE id='40000000-0000-0000-0000-000000000008';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SELECT private.admin_approve_portal_registration(
 '50000000-0000-0000-0000-000000000003',
 '40000000-0000-0000-0000-000000000008'
);
RESET ROLE;

DO $email_mismatch_corrected$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE id='50000000-0000-0000-0000-000000000003'
     AND status='approved' AND matched_member_id='40000000-0000-0000-0000-000000000008'
 ) THEN RAISE EXCEPTION 'Corrected email-mismatch request was not approved'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_access
   WHERE workspace_id='20000000-0000-0000-0000-000000000001'
     AND member_id='40000000-0000-0000-0000-000000000008'
     AND lower(email)='corrected-email@example.invalid'
 ) THEN RAISE EXCEPTION 'Corrected email-mismatch approval did not create portal access'; END IF;
END;
$email_mismatch_corrected$;

-- A pending registration must not take over a member already linked to another account.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
DO $relink_assert$
BEGIN
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000006'
   );
   RAISE EXCEPTION 'Expected PORTAL_MEMBER_ALREADY_LINKED';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_MEMBER_ALREADY_LINKED' THEN RAISE; END IF;
 END;
END;
$relink_assert$;
RESET ROLE;



DO $relink_state_assert$
BEGIN
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000006') <> '10000000-0000-0000-0000-000000000003'::uuid THEN
   RAISE EXCEPTION 'Existing condominium member account link was changed';
 END IF;
 IF (SELECT status FROM public.portal_registration_requests
     WHERE id='50000000-0000-0000-0000-000000000002') <> 'pending' THEN
   RAISE EXCEPTION 'Rejected account relink unexpectedly changed request status';
 END IF;
END;
$relink_state_assert$;

-- A staff account that is also a condominium member must not be downgraded.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SELECT private.complete_portal_registration('QA Portal Admin',NULL,'Admin approval test condominium');
RESET ROLE;

DO $staff_role_assert$
BEGIN
 IF (SELECT role FROM public.workspace_members
     WHERE workspace_id='20000000-0000-0000-0000-000000000001'
       AND user_id='10000000-0000-0000-0000-000000000001') <> 'admin' THEN
   RAISE EXCEPTION 'Resident portal registration downgraded an existing workspace administrator';
 END IF;
 IF (SELECT role FROM public.profiles
     WHERE id='10000000-0000-0000-0000-000000000001') <> 'admin' THEN
   RAISE EXCEPTION 'Resident portal registration downgraded the administrator profile role';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.portal_access
     WHERE workspace_id='20000000-0000-0000-0000-000000000001'
       AND member_id='40000000-0000-0000-0000-000000000005'
       AND lower(email)='admin-portal-test@example.invalid') THEN
   RAISE EXCEPTION 'Dual staff/resident portal access was not created';
 END IF;
END;
$staff_role_assert$;

-- A unique person match must still fail closed when two active condominiums
-- with the selected name exist inside the same workspace.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000012';
DO $same_workspace_duplicate_self_registration$
BEGIN
 BEGIN
   PERFORM private.complete_portal_registration(
     'Unique Duplicate Condo Resident',NULL,'Same Workspace Duplicate Name'
   );
   RAISE EXCEPTION 'Expected PORTAL_CONDOMINIUM_AMBIGUOUS_WITHIN_WORKSPACE';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_CONDOMINIUM_AMBIGUOUS_WITHIN_WORKSPACE' THEN RAISE; END IF;
 END;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000014') IS NOT NULL THEN
   RAISE EXCEPTION 'Same-workspace duplicate condominium self-registration linked the resident';
 END IF;
 IF EXISTS (SELECT 1 FROM public.portal_access WHERE member_id='40000000-0000-0000-0000-000000000014') THEN
   RAISE EXCEPTION 'Same-workspace duplicate condominium self-registration created portal access';
 END IF;
 IF EXISTS (SELECT 1 FROM public.portal_registration_requests
            WHERE requested_user_id='10000000-0000-0000-0000-000000000012') THEN
   RAISE EXCEPTION 'Ambiguous same-workspace self-registration created an automatically assigned request';
 END IF;
END;
$same_workspace_duplicate_self_registration$;
RESET ROLE;

-- A unique person match must not override a different condominium explicitly selected by the resident.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
DO $wrong_condominium_self_registration$
BEGIN
 BEGIN
   PERFORM private.complete_portal_registration(
     'Self Registered Resident',NULL,'Admin approval test condominium'
   );
   RAISE EXCEPTION 'Expected PORTAL_MEMBER_CONDOMINIUM_MISMATCH';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_MEMBER_CONDOMINIUM_MISMATCH' THEN RAISE; END IF;
 END;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000002') IS NOT NULL THEN
   RAISE EXCEPTION 'Wrong-condominium self-registration linked the resident account';
 END IF;
 IF EXISTS (SELECT 1 FROM public.portal_access
            WHERE member_id='40000000-0000-0000-0000-000000000002') THEN
   RAISE EXCEPTION 'Wrong-condominium self-registration created portal access';
 END IF;
END;
$wrong_condominium_self_registration$;

-- The exact condominium match can now complete normally.
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
 IF (SELECT status FROM public.portal_registration_requests
     WHERE id='50000000-0000-0000-0000-000000000006') <> 'pending' THEN
   RAISE EXCEPTION 'Self-registration approved a different condominium request for the same account';
 END IF;
END;
$resident_assert$;

-- With multiple workspaces, missing or unknown condominium names must
-- fail closed instead of creating requests invisible to every manager.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
DO $missing_condominium_name_guard$
BEGIN
 BEGIN
   PERFORM private.complete_portal_registration('Unmatched Resident',NULL,NULL);
   RAISE EXCEPTION 'Expected PORTAL_CONDOMINIUM_NAME_REQUIRED';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_CONDOMINIUM_NAME_REQUIRED' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM private.complete_portal_registration('Unmatched Resident',NULL,'No such condominium');
   RAISE EXCEPTION 'Expected PORTAL_CONDOMINIUM_NOT_FOUND';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_CONDOMINIUM_NOT_FOUND' THEN RAISE; END IF;
 END;
END;
$missing_condominium_name_guard$;
RESET ROLE;

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

-- Unassigned requests are visible to managers in matching workspaces,
-- but must not leak to administrators of unrelated workspaces.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000007';
DO $unrelated_workspace_visibility$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE requested_user_id='10000000-0000-0000-0000-000000000004'
     AND status='pending' AND workspace_id IS NULL
 ) THEN
   RAISE EXCEPTION 'Unassigned request leaked to an unrelated workspace administrator';
 END IF;
END;
$unrelated_workspace_visibility$;
RESET ROLE;

-- An authorized administrator in the selected workspace can manually resolve
-- the unassigned request; the request is then bound to that workspace/member.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000006';
SELECT private.can_manage_workspace_module('20000000-0000-0000-0000-000000000002','portale') AS workspace_two_admin_can_manage_portal;
SELECT p.proname, pg_get_userbyid(p.proowner) AS function_owner, r.rolsuper, r.rolbypassrls
FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
WHERE p.oid IN (
  'private.admin_approve_portal_registration(uuid,uuid)'::regprocedure,
  'private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)'::regprocedure
);
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS table_owner
FROM pg_class c WHERE c.oid='public.portal_access'::regclass;
DO $wrong_condominium_manual_approval$
DECLARE v_request_id uuid;
BEGIN
 SELECT id INTO v_request_id
 FROM public.portal_registration_requests
 WHERE requested_user_id='10000000-0000-0000-0000-000000000004'
   AND status='pending' AND workspace_id IS NULL;
 IF v_request_id IS NULL THEN RAISE EXCEPTION 'Unassigned ambiguous request was not created'; END IF;
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     v_request_id,'40000000-0000-0000-0000-000000000011'
   );
   RAISE EXCEPTION 'Expected PORTAL_REQUEST_CONDOMINIUM_MISMATCH';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_REQUEST_CONDOMINIUM_MISMATCH' THEN RAISE; END IF;
 END;
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE id=v_request_id AND status='pending' AND workspace_id IS NULL
 ) THEN RAISE EXCEPTION 'Wrong-condominium approval changed the unassigned request'; END IF;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000011') IS NOT NULL THEN
   RAISE EXCEPTION 'Wrong-condominium approval linked the resident account';
 END IF;
 IF EXISTS (SELECT 1 FROM public.portal_access WHERE member_id='40000000-0000-0000-0000-000000000011') THEN
   RAISE EXCEPTION 'Wrong-condominium approval created portal access';
 END IF;
END;
$wrong_condominium_manual_approval$;

DO $resolve_ambiguous$
DECLARE v_request_id uuid;
BEGIN
 SELECT id INTO v_request_id
 FROM public.portal_registration_requests
 WHERE requested_user_id='10000000-0000-0000-0000-000000000004'
   AND status='pending' AND workspace_id IS NULL;
 IF v_request_id IS NULL THEN RAISE EXCEPTION 'Unassigned ambiguous request was not created'; END IF;
 PERFORM private.admin_approve_portal_registration(
   v_request_id,'40000000-0000-0000-0000-000000000007'
 );
END;
$resolve_ambiguous$;
RESET ROLE;

DO $ambiguous_manual_approval_assert$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE requested_user_id='10000000-0000-0000-0000-000000000004'
     AND status='approved'
     AND workspace_id='20000000-0000-0000-0000-000000000002'
     AND matched_member_id='40000000-0000-0000-0000-000000000007'
 ) THEN
   RAISE EXCEPTION 'Authorized manual approval did not resolve the unassigned request';
 END IF;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000007') <> '10000000-0000-0000-0000-000000000004'::uuid THEN
   RAISE EXCEPTION 'Manual approval did not link the selected resident account';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_access
   WHERE workspace_id='20000000-0000-0000-0000-000000000002'
     AND member_id='40000000-0000-0000-0000-000000000007'
     AND lower(email)='unmatched-resident@example.invalid'
 ) THEN
   RAISE EXCEPTION 'Manual approval did not create portal access in the selected workspace';
 END IF;
END;
$ambiguous_manual_approval_assert$;

-- Same-name condominiums inside one workspace are still ambiguous when the
-- same verified email is present on multiple active member records.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
DO $same_workspace_ambiguous_approval$
BEGIN
 BEGIN
   PERFORM private.admin_approve_portal_registration(
     '50000000-0000-0000-0000-000000000007',
     '40000000-0000-0000-0000-000000000012'
   );
   RAISE EXCEPTION 'Expected PORTAL_REQUEST_CONDOMINIUM_AMBIGUOUS_WITHIN_WORKSPACE';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'PORTAL_REQUEST_CONDOMINIUM_AMBIGUOUS_WITHIN_WORKSPACE' THEN RAISE; END IF;
 END;
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_registration_requests
   WHERE id='50000000-0000-0000-0000-000000000007'
     AND status='pending' AND workspace_id IS NULL
 ) THEN RAISE EXCEPTION 'Ambiguous same-workspace approval changed the request'; END IF;
 IF (SELECT user_id FROM public.condominium_members
     WHERE id='40000000-0000-0000-0000-000000000012') IS NOT NULL THEN
   RAISE EXCEPTION 'Ambiguous same-workspace approval linked a resident account'; END IF;
 IF EXISTS (SELECT 1 FROM public.portal_access
            WHERE member_id IN ('40000000-0000-0000-0000-000000000012',
                                '40000000-0000-0000-0000-000000000013')) THEN
   RAISE EXCEPTION 'Ambiguous same-workspace approval created portal access'; END IF;
END;
$same_workspace_ambiguous_approval$;
RESET ROLE;

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
    "ambiguous cross-workspace request remains unassigned until an authorized administrator resolves it",
    "portal approval rejects unverified accounts and account/request/member email mismatches without linking or granting access",
    "legacy-id/email conflicting duplicates fail closed",
    "archived condominium portal upsert rejected",
    "helper inaccessible directly to anon/authenticated/service_role",
    "authenticated callers retain intended EXECUTE",
    "all synthetic data rolled back",
  ],
  remote_databases_touched: false,
}, null, 2));
