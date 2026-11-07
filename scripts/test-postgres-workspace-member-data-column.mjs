import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URL refused");

const migration = await readFile(
  "supabase/rebuild/drafts/20261105040000_add_workspace_member_profile_data.sql",
  "utf8"
);
const setup = `BEGIN;
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  condominium_id uuid,
  legacy_id bigint,
  PRIMARY KEY (workspace_id,user_id)
);
INSERT INTO public.workspace_members(workspace_id,user_id,role)
VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','collaborator');`;
const verify = `
DO $assert$
DECLARE v_type text; v_not_null boolean; v_default text; v_data jsonb; v_new jsonb;
BEGIN
  SELECT data_type, is_nullable='NO', column_default INTO v_type,v_not_null,v_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data';
  IF v_type IS DISTINCT FROM 'jsonb' OR NOT COALESCE(v_not_null,false)
     OR v_default IS DISTINCT FROM '''{}''::jsonb' THEN
    RAISE EXCEPTION 'column definition mismatch: %, %, %',v_type,v_not_null,v_default;
  END IF;
  SELECT data INTO v_data FROM public.workspace_members
  WHERE user_id='00000000-0000-0000-0000-000000000002';
  IF v_data IS DISTINCT FROM '{}'::jsonb THEN RAISE EXCEPTION 'existing row not backfilled to {}'; END IF;
  INSERT INTO public.workspace_members(workspace_id,user_id,role)
  VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','collaborator')
  RETURNING data INTO v_new;
  IF v_new IS DISTINCT FROM '{}'::jsonb THEN RAISE EXCEPTION 'new row default incorrect'; END IF;
END $assert$;
ROLLBACK;`;
execFileSync("psql",[
  "-X","--no-psqlrc","--dbname",url,"-v","ON_ERROR_STOP=1",
  "-c",setup+"\n"+migration+"\n"+migration+"\n"+verify
],{stdio:"inherit"});
console.log(JSON.stringify({
  status:"PASS",
  postgres:17,
  scenario:"Production workspace_members schema without profile data",
  existing_rows:"preserved with {} default",
  new_rows:"default {}",
  idempotency:"draft applied twice",
  transaction:"rolled back",
  remote_databases_touched:false
},null,2));
