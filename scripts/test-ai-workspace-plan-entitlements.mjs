import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkWorkspacePlanEntitlement } from "../supabase/functions/_shared/workspace-plan-entitlement.js";

function createClient({ plan = null, error = null, throws = false } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return {
                async maybeSingle() {
                  calls.push(["maybeSingle"]);
                  if (throws) throw new Error("simulated network failure");
                  return { data: plan === null ? null : { plan }, error };
                },
              };
            },
          };
        },
      };
    },
  };
  return client;
}

const cases = [
  { required: "plus", plan: "free", allowed: false, status: 403 },
  { required: "plus", plan: "plus", allowed: true, status: 200 },
  { required: "plus", plan: "professional", allowed: true, status: 200 },
  { required: "plus", plan: "portal", allowed: true, status: 200 },
  { required: "professional", plan: "free", allowed: false, status: 403 },
  { required: "professional", plan: "plus", allowed: false, status: 403 },
  { required: "professional", plan: "professional", allowed: true, status: 200 },
  { required: "professional", plan: "portal", allowed: true, status: 200 },
];

for (const item of cases) {
  const client = createClient({ plan: item.plan });
  const result = await checkWorkspacePlanEntitlement(client, "workspace-1", item.required);
  assert.equal(result.allowed, item.allowed, `${item.plan} -> ${item.required}`);
  assert.equal(result.status, item.status, `${item.plan} status -> ${item.required}`);
  assert.deepEqual(client.calls, [
    ["from", "workspaces"],
    ["select", "plan"],
    ["eq", "id", "workspace-1"],
    ["maybeSingle"],
  ]);
}

const unknownPlan = await checkWorkspacePlanEntitlement(createClient({ plan: "enterprise-preview" }), "workspace-1", "plus");
assert.equal(unknownPlan.allowed, false);
assert.equal(unknownPlan.status, 403);
assert.equal(unknownPlan.code, "WORKSPACE_PLAN_REQUIRED");

const missingPlan = await checkWorkspacePlanEntitlement(createClient(), "workspace-1", "plus");
assert.equal(missingPlan.allowed, false);
assert.equal(missingPlan.status, 403);

const queryError = await checkWorkspacePlanEntitlement(createClient({ error: { message: "RLS/read failure" } }), "workspace-1", "plus");
assert.equal(queryError.allowed, false);
assert.equal(queryError.status, 503);
assert.equal(queryError.code, "WORKSPACE_PLAN_LOOKUP_FAILED");

const thrownQuery = await checkWorkspacePlanEntitlement(createClient({ throws: true }), "workspace-1", "plus");
assert.equal(thrownQuery.allowed, false);
assert.equal(thrownQuery.status, 503);

const missingClient = await checkWorkspacePlanEntitlement(null, "workspace-1", "plus");
assert.equal(missingClient.allowed, false);
assert.equal(missingClient.status, 503);

const missingWorkspace = await checkWorkspacePlanEntitlement(createClient({ plan: "professional" }), "", "plus");
assert.equal(missingWorkspace.allowed, false);
assert.equal(missingWorkspace.status, 503);

const invalidRequirement = await checkWorkspacePlanEntitlement(createClient({ plan: "professional" }), "workspace-1", "enterprise");
assert.equal(invalidRequirement.allowed, false);
assert.equal(invalidRequirement.status, 503);

// Extra client-side fields are intentionally not inputs to the server entitlement check.
const forgedClientAddon = await checkWorkspacePlanEntitlement(
  createClient({ plan: "free" }),
  "workspace-1",
  "plus",
  { plan: "professional", addons: ["ai"] },
);
assert.equal(forgedClientAddon.allowed, false);
assert.equal(forgedClientAddon.status, 403);

const documentSource = await readFile(
  new URL("../supabase/functions/bethag-ai-document/index.ts", import.meta.url),
  "utf8",
);
const condominiumSource = await readFile(
  new URL("../supabase/functions/bethag-ai-condominium/index.ts", import.meta.url),
  "utf8",
);

assert.match(documentSource, /import \{ checkWorkspacePlanEntitlement \} from "\.\.\/_shared\/workspace-plan-entitlement\.js"/);
assert.match(documentSource, /checkWorkspacePlanEntitlement\(sb, workspaceId, "plus"\)/);
assert.match(condominiumSource, /import \{ checkWorkspacePlanEntitlement \} from "\.\.\/_shared\/workspace-plan-entitlement\.js"/);
assert.match(condominiumSource, /checkWorkspacePlanEntitlement\(supabase, workspaceId, "professional"\)/);

const documentPlanIndex = documentSource.indexOf('checkWorkspacePlanEntitlement(sb, workspaceId, "plus")');
const documentDownloadIndex = documentSource.indexOf('storage.from("bethag-documents").download');
const documentUploadIndex = documentSource.indexOf('fetch("https://api.openai.com/v1/files"');
assert.ok(documentPlanIndex > documentSource.indexOf("BETHAG_AI_ENABLED"));
assert.ok(documentPlanIndex < documentDownloadIndex);
assert.ok(documentPlanIndex < documentUploadIndex);

const condominiumPlanIndex = condominiumSource.indexOf('checkWorkspacePlanEntitlement(supabase, workspaceId, "professional")');
const condominiumDownloadIndex = condominiumSource.indexOf('storage.from("bethag-documents").download');
const condominiumUploadIndex = condominiumSource.indexOf('fetch("https://api.openai.com/v1/files"');
assert.ok(condominiumPlanIndex > condominiumSource.indexOf("BETHAG_AI_ENABLED"));
assert.ok(condominiumPlanIndex < condominiumDownloadIndex);
assert.ok(condominiumPlanIndex < condominiumUploadIndex);

assert.doesNotMatch(documentSource, /\b(?:p|payload)\.(?:plan|addons)\b/);
assert.doesNotMatch(condominiumSource, /\b(?:p|payload)\.(?:plan|addons)\b/);

console.log("PASS workspace plan entitlement runtime matrix: document AI requires Plus; condominium AI requires Professional.");
console.log("PASS unknown/missing plans and database errors fail closed.");
console.log("PASS client-supplied plan/add-on fields cannot override the database plan.");
console.log("PASS both AI Edge Functions enforce plan before Storage download and OpenAI upload.");
