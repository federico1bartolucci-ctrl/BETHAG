import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const projectRef = "jhuyhlzzydcgghrzeexn";
const workspaceId = "d4e4d6ae-93a8-43f4-9e76-e63570a9de3a";
const statePath = "/tmp/bethag-qa-browser-original-workspace-plan.json";
const mode = process.argv[2];
const url = process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
const key = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key, "Missing QA service-role key");
assert.ok(["prepare", "restore"].includes(mode), "Usage: node scripts/qa-browser-plan-fixture.mjs prepare|restore");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

if (mode === "prepare") {
  const { data, error } = await db.from("workspaces").select("id,plan").eq("id", workspaceId).single();
  assert.ifError(error);
  assert.equal(data.id, workspaceId, "Unexpected QA workspace");
  assert.equal(data.plan, "free", "QA workspace plan changed unexpectedly; refusing to overwrite it");
  fs.writeFileSync(statePath, JSON.stringify({ projectRef, workspaceId, originalPlan: data.plan }), "utf8");
  const update = await db.from("workspaces").update({ plan: "portal" }).eq("id", workspaceId).eq("plan", "free").select("id,plan").single();
  assert.ifError(update.error);
  assert.equal(update.data.plan, "portal");
  const verify = await db.from("workspaces").select("plan").eq("id", workspaceId).single();
  assert.ifError(verify.error);
  assert.equal(verify.data.plan, "portal", "QA Portal fixture was not persisted");
  console.log(JSON.stringify({ suite: "BETHAG_QA_BROWSER_PLAN_FIXTURE", status: "PREPARED", projectRef, workspaceId, originalPlan: "free", testPlan: "portal" }));
} else {
  if (!fs.existsSync(statePath)) {
    console.log(JSON.stringify({ suite: "BETHAG_QA_BROWSER_PLAN_FIXTURE", status: "RESTORE_NOT_REQUIRED", projectRef, workspaceId }));
  } else {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(state.projectRef, projectRef, "Refusing to restore a different Supabase project");
    assert.equal(state.workspaceId, workspaceId, "Refusing to restore a different workspace");
    const current = await db.from("workspaces").select("plan").eq("id", workspaceId).single();
    assert.ifError(current.error);
    assert.equal(current.data.plan, "portal", "QA workspace plan changed unexpectedly; refusing to overwrite it");
    const update = await db.from("workspaces").update({ plan: state.originalPlan }).eq("id", workspaceId).eq("plan", "portal").select("id,plan").single();
    assert.ifError(update.error);
    assert.equal(update.data.plan, state.originalPlan);
    const verify = await db.from("workspaces").select("plan").eq("id", workspaceId).single();
    assert.ifError(verify.error);
    assert.equal(verify.data.plan, state.originalPlan, "Original QA workspace plan was not restored");
    fs.unlinkSync(statePath);
    console.log(JSON.stringify({ suite: "BETHAG_QA_BROWSER_PLAN_FIXTURE", status: "RESTORED", projectRef, workspaceId, restoredPlan: state.originalPlan }));
  }
}
