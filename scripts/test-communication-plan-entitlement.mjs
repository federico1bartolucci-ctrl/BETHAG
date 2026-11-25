import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkWorkspacePlanEntitlement } from "../supabase/functions/_shared/workspace-plan-entitlement.js";

function clientFor(result, shouldThrow = false) {
  return {
    from(table) {
      assert.equal(table, "workspaces");
      return {
        select(columns) {
          assert.equal(columns, "plan");
          return {
            eq(column, value) {
              assert.equal(column, "id");
              assert.equal(value, "workspace-1");
              return {
                async maybeSingle() {
                  if (shouldThrow) throw new Error("database unavailable");
                  return result;
                },
              };
            },
          };
        },
      };
    },
  };
}

for (const plan of ["plus", "professional", "portal"]) {
  const result = await checkWorkspacePlanEntitlement(
    clientFor({ data: { plan }, error: null }),
    "workspace-1",
    "plus",
  );
  assert.equal(result.allowed, true, plan + " must permit communication delivery.");
  assert.equal(result.status, 200);
}

for (const plan of ["free", "unknown", null, undefined]) {
  const result = await checkWorkspacePlanEntitlement(
    clientFor({ data: plan ? { plan } : null, error: null }),
    "workspace-1",
    "plus",
  );
  assert.equal(result.allowed, false, String(plan) + " must not permit communication delivery.");
  assert.equal(result.status, 403);
  assert.equal(result.code, "WORKSPACE_PLAN_REQUIRED");
}

const queryError = await checkWorkspacePlanEntitlement(
  clientFor({ data: null, error: { message: "permission denied" } }),
  "workspace-1",
  "plus",
);
assert.equal(queryError.allowed, false);
assert.equal(queryError.status, 503);
assert.equal(queryError.code, "WORKSPACE_PLAN_LOOKUP_FAILED");

const thrownError = await checkWorkspacePlanEntitlement(
  clientFor(null, true),
  "workspace-1",
  "plus",
);
assert.equal(thrownError.allowed, false);
assert.equal(thrownError.status, 503);

const missingClient = await checkWorkspacePlanEntitlement(null, "workspace-1", "plus");
assert.equal(missingClient.allowed, false);
assert.equal(missingClient.status, 503);

const edgeFunction = await readFile(
  new URL("../supabase/functions/bethag-send-email/index.ts", import.meta.url),
  "utf8",
);
const gateIndex = edgeFunction.indexOf("checkWorkspacePlanEntitlement(");
const prepareIndex = edgeFunction.indexOf('supabase.rpc("prepare_communication_recipients"');
const resendIndex = edgeFunction.indexOf('fetch("https://api.resend.com/emails"');
assert.ok(gateIndex >= 0, "Email Edge Function must enforce the server-owned workspace plan.");
assert.ok(gateIndex < prepareIndex, "Plan gate must run before recipient preparation.");
assert.ok(gateIndex < resendIndex, "Plan gate must run before any Resend API request.");
assert.match(edgeFunction, /communication\.workspace_id,\s*"plus"/);
assert.match(edgeFunction, /planEntitlement\.status === 403/);
assert.match(edgeFunction, /}, 503\)/);

const migration = await readFile(
  new URL("../supabase/rebuild/proposed-forward-migrations/20261125141500_require_plus_plan_for_communications.sql", import.meta.url),
  "utf8",
);
assert.match(migration, /private\.workspace_has_plus_plan/);
assert.match(migration, /COMMUNICATIONS_PLAN_REQUIRED/);
assert.match(migration, /trg_guard_communications_plan_entitlement/);
assert.match(migration, /trg_guard_communication_recipient_plan_entitlement/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.prepare_communication_recipients/);
assert.match(migration, /RETURN private\.prepare_communication_recipients/);
assert.match(migration, /RETURN private\.reset_stale_communication_recipients/);
assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION private\.prepare_communication_recipients/,
  "The plan guard must not overwrite the independent recipient retry/idempotency implementation.");
assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION private\.reset_stale_communication_recipients/,
  "The plan guard must delegate to the private stale-queue implementation.");

console.log("PASS communication plan entitlement runtime matrix: Free/unknown/missing plans are denied; Plus, Professional and Portal are allowed.");
console.log("PASS communication send fails closed on plan lookup errors.");
console.log("PASS bethag-send-email checks the server-owned plan before recipient preparation and before Resend.");
console.log("PASS communication content and recipient identity are protected by the forward-only plan guard.");
