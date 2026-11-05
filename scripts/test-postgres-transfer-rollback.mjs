import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URL refused");

const functionSql = await readFile(
  "supabase/rebuild/test-fixtures/qa-close-condominium-member-transfer-20261105.sql",
  "utf8"
);
const setup = `BEGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TABLE public.condominium_members (
  id uuid PRIMARY KEY,
  active boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.condominium_member_transfers (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  outgoing_member_id uuid NOT NULL,
  status text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_at timestamptz,
  closed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.condominium_installments (
  member_id uuid, amount numeric, paid_amount numeric
);
CREATE TABLE public.condominium_expense_allocations (
  member_id uuid, amount numeric, paid_amount numeric
);
CREATE TABLE public.condominium_fiscal_carryovers (
  workspace_id uuid, condominium_id uuid, unit_id uuid, member_id uuid, balance numeric
);
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $uid$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $uid$;
CREATE FUNCTION private.can_manage_workspace_module(uuid,text) RETURNS boolean
LANGUAGE sql STABLE
AS $permission$ SELECT true $permission$;
CREATE FUNCTION public.raise_after_member_update() RETURNS trigger
LANGUAGE plpgsql
AS $trigger$
BEGIN
  IF NEW.status='Chiuso' THEN
    RAISE EXCEPTION 'BETHAG_CONTROLLED_ROLLBACK';
  END IF;
  RETURN NEW;
END
$trigger$;
CREATE TRIGGER controlled_failure_after_member_update
BEFORE UPDATE ON public.condominium_member_transfers
FOR EACH ROW EXECUTE FUNCTION public.raise_after_member_update();
INSERT INTO public.condominium_members(id,active,data)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  true,
  '{"position_status":"In chiusura","current_owner":false}'::jsonb
);
INSERT INTO public.condominium_member_transfers(
  id,workspace_id,condominium_id,unit_id,outgoing_member_id,status,data
) VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000101',
  'Confermato',
  '{"transfer_scope":"whole_property","outgoing_member_ids":["00000000-0000-0000-0000-000000000101"]}'::jsonb
);
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000601';`;
const verify = `
DO $assert$
DECLARE v_message text; v_active boolean; v_position text; v_status text; v_closed_at timestamptz; v_closed_by uuid;
BEGIN
  BEGIN
    PERFORM private.close_condominium_member_transfer('00000000-0000-0000-0000-000000000201');
    RAISE EXCEPTION 'TEST_EXPECTED_FAILURE_NOT_RAISED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'BETHAG_CONTROLLED_ROLLBACK' THEN
      RAISE EXCEPTION 'Unexpected closure error: %',v_message;
    END IF;
  END;

  SELECT active,data->>'position_status' INTO v_active,v_position
  FROM public.condominium_members
  WHERE id='00000000-0000-0000-0000-000000000101';
  SELECT status,closed_at,closed_by INTO v_status,v_closed_at,v_closed_by
  FROM public.condominium_member_transfers
  WHERE id='00000000-0000-0000-0000-000000000201';

  IF v_active IS DISTINCT FROM true OR v_position IS DISTINCT FROM 'In chiusura' THEN
    RAISE EXCEPTION 'Member update was not rolled back: active %, position %',v_active,v_position;
  END IF;
  IF v_status IS DISTINCT FROM 'Confermato' OR v_closed_at IS NOT NULL OR v_closed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Transfer update was not rolled back: status %, closed_at %, closed_by %',v_status,v_closed_at,v_closed_by;
  END IF;
END
$assert$;
ROLLBACK;`;
execFileSync("psql",[
  "-X","--no-psqlrc","--dbname",url,"-v","ON_ERROR_STOP=1",
  "-c",setup+"\\n"+functionSql+"\\n"+verify
],{stdio:"inherit"});
console.log(JSON.stringify({
  status:"PASS",
  postgres:17,
  scenario:"controlled failure after outgoing member update",
  function_source:"exact QA pg_get_functiondef snapshot",
  assertions:["member update rolled back","transfer remains Confermato","closed_at/closed_by remain NULL"],
  transaction:"rolled back",
  remote_databases_touched:false
},null,2));
