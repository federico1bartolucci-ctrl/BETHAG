import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const psql = (sql) => execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const workspace = "d1d1d1d1-1111-4111-8111-111111111111";
const deniedUser = "d2d2d2d2-2222-4222-8222-222222222222";
const allowedUser = "d3d3d3d3-3333-4333-8333-333333333333";
const missingUser = "d4d4d4d4-4444-4444-8444-444444444444";
const marker = "BETHAG_PERMISSION_REGRESSION_ROLLBACK_ONLY";

psql(`
INSERT INTO public.workspaces(id,name,plan)
VALUES ('${workspace}','${marker}','free')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
DELETE FROM public.workspace_members
WHERE workspace_id='${workspace}'::uuid
  AND user_id IN ('${deniedUser}'::uuid,'${allowedUser}'::uuid,'${missingUser}'::uuid);
INSERT INTO public.profiles(id,full_name,email,role,active)
VALUES
 ('${deniedUser}','QA denied collaborator','qa-denied@example.invalid','collaborator',true),
 ('${allowedUser}','QA allowed collaborator','qa-allowed@example.invalid','collaborator',true),
 ('${missingUser}','QA missing permission','qa-missing@example.invalid','collaborator',true)
ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,active=true;
INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions)
VALUES
 ('${workspace}','${deniedUser}','collaborator',true,'{"condomini":false}'::jsonb),
 ('${workspace}','${allowedUser}','collaborator',true,'{"condomini":true}'::jsonb),
 ('${workspace}','${missingUser}','collaborator',true,'{}'::jsonb);
`);

const attempt = (userId, shouldAllow) => {
  const sql = `
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${userId}',true);
INSERT INTO public.condominiums(workspace_id,name)
VALUES ('${workspace}','${marker}_${userId}');
ROLLBACK;
`;
  try {
    psql(sql);
    assert.equal(shouldAllow, true, `Expected RLS to deny collaborator ${userId}`);
  } catch (error) {
    if (shouldAllow) {
      throw new Error(`Expected collaborator ${userId} with condomini=true to INSERT, but PostgreSQL rejected it: ${error.stderr || error.message}`);
    }
    const detail = String(error.stderr || error.message);
    assert.match(detail, /row-level security|permission denied|violates row-level security/i,
      `Expected an authorization denial for collaborator ${userId}, got an unrelated SQL error: ${detail}`);
  }
};

attempt(deniedUser, false);
attempt(allowedUser, true);
attempt(missingUser, false);

const leftovers = Number(psql(`
SELECT
 (SELECT count(*) FROM public.condominiums WHERE workspace_id='${workspace}'::uuid AND name LIKE '${marker}%')
 +
 (SELECT count(*) FROM public.workspaces WHERE id='${workspace}'::uuid AND name='${marker}');
`).trim());
assert.equal(leftovers, 1, "Test condominiums must roll back; only the isolated workspace fixture may remain.");

psql(`
DELETE FROM public.workspace_members WHERE workspace_id='${workspace}'::uuid;
DELETE FROM public.workspaces WHERE id='${workspace}'::uuid;
DELETE FROM public.profiles WHERE id IN ('${deniedUser}'::uuid,'${allowedUser}'::uuid,'${missingUser}'::uuid);
`);
console.log(JSON.stringify({
  test: "collaborator condominium module authorization",
  postgres: "17",
  cases: {
    "condomini=false": "DENIED",
    "condomini=true": "ALLOWED",
    "permission absent": "DENIED"
  },
  inserted_condominiums_persisted: 0,
  fixtures_cleaned: true,
  target: "isolated CI PostgreSQL only"
}, null, 2));
