import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
function psql(args) { return execFileSync("psql", ["-X","-v","ON_ERROR_STOP=1",...args], {encoding:"utf8",stdio:["ignore","pipe","inherit"],env:process.env}).trim(); }
const fixture = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth, private TO authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text, active boolean, updated_at timestamptz);
CREATE TABLE public.workspaces(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,plan text NOT NULL DEFAULT 'free',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.workspace_members(workspace_id uuid NOT NULL REFERENCES public.workspaces(id),user_id uuid NOT NULL REFERENCES auth.users(id),role text NOT NULL,active boolean NOT NULL DEFAULT true,permissions jsonb NOT NULL DEFAULT '{}'::jsonb,UNIQUE(workspace_id,user_id));
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.profiles(id,role,active) VALUES ('11111111-1111-4111-8111-111111111111','resident',true),('22222222-2222-4222-8222-222222222222','resident',true);
CREATE FUNCTION private.claim_first_workspace_admin(uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::uuid';
CREATE FUNCTION public.claim_first_workspace_admin(uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY INVOKER AS 'SELECT private.claim_first_workspace_admin($1)';
GRANT EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_workspace_admin(uuid) TO authenticated;
`;
psql(["-c",fixture]);
psql(["-f","supabase/rebuild/drafts/20261108143000_secure_first_workspace_bootstrap.sql"]);
const first=psql(["-A","-t","-c","SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; SET ROLE authenticated; SELECT public.create_first_workspace_for_authenticated_admin('Workspace Uno'); RESET ROLE;"]).split("\n").filter(x=>/^[0-9a-f-]{36}$/.test(x)).at(-1);
assert.match(first||"",/^[0-9a-f-]{36}$/);
const repeat=psql(["-A","-t","-c","SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; SET ROLE authenticated; SELECT public.create_first_workspace_for_authenticated_admin('Nome ignorato'); RESET ROLE;"]).split("\n").filter(x=>/^[0-9a-f-]{36}$/.test(x)).at(-1);
assert.equal(repeat,first,"Retry must return same workspace");
const second=psql(["-A","-t","-c","SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'; SET ROLE authenticated; SELECT public.create_first_workspace_for_authenticated_admin('Workspace Due'); RESET ROLE;"]).split("\n").filter(x=>/^[0-9a-f-]{36}$/.test(x)).at(-1);
assert.match(second||"",/^[0-9a-f-]{36}$/); assert.notEqual(second,first);
const checks=JSON.parse(psql(["-A","-t","-c",`
SELECT json_build_object(
 'workspace_count',(SELECT count(*) FROM public.workspaces),
 'owner_count',(SELECT count(DISTINCT created_by_user_id) FROM public.workspaces),
 'first_owner',(SELECT created_by_user_id::text FROM public.workspaces WHERE id='${first}'),
 'second_owner',(SELECT created_by_user_id::text FROM public.workspaces WHERE id='${second}'),
 'first_admin',(SELECT count(*) FROM public.workspace_members WHERE workspace_id='${first}' AND user_id='11111111-1111-4111-8111-111111111111' AND role='admin' AND active),
 'second_admin',(SELECT count(*) FROM public.workspace_members WHERE workspace_id='${second}' AND user_id='22222222-2222-4222-8222-222222222222' AND role='admin' AND active),
 'old_claim_auth',has_function_privilege('authenticated','public.claim_first_workspace_admin(uuid)','EXECUTE'),
 'new_claim_anon',has_function_privilege('anon','public.create_first_workspace_for_authenticated_admin(text)','EXECUTE'),
 'new_claim_auth',has_function_privilege('authenticated','public.create_first_workspace_for_authenticated_admin(text)','EXECUTE')
)::text;`]));
assert.deepEqual(checks,{workspace_count:2,owner_count:2,first_owner:"11111111-1111-4111-8111-111111111111",second_owner:"22222222-2222-4222-8222-222222222222",first_admin:1,second_admin:1,old_claim_auth:false,new_claim_anon:false,new_claim_auth:true});
console.log(JSON.stringify({first_workspace_bootstrap:"PASS",postgres:"17",assertions:checks},null,2));
