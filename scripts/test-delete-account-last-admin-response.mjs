import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createDeleteAccountFailureResponse,
  LAST_ACTIVE_WORKSPACE_ADMIN_MESSAGE,
} from "../supabase/functions/_shared/delete-account-error-response.js";

async function readResponse(response) {
  return { status: response.status, body: await response.json() };
}

test("a confirmed last-admin race returns an actionable HTTP 409", async () => {
  const result = await readResponse(
    createDeleteAccountFailureResponse(
      { message: "Database error deleting user" },
      { lastActiveWorkspaceAdmin: true },
    ),
  );

  assert.equal(result.status, 409);
  assert.equal(result.body.error, LAST_ACTIVE_WORKSPACE_ADMIN_MESSAGE);
});

test("the stable database guard marker also maps to HTTP 409", async () => {
  const result = await readResponse(
    createDeleteAccountFailureResponse({
      message: "Database error deleting user: LAST_ACTIVE_WORKSPACE_ADMIN",
    }),
  );

  assert.equal(result.status, 409);
  assert.equal(result.body.error, LAST_ACTIVE_WORKSPACE_ADMIN_MESSAGE);
});

test("an unrelated Auth deletion failure remains HTTP 500", async () => {
  const result = await readResponse(
    createDeleteAccountFailureResponse(
      { message: "Database error deleting user" },
      { lastActiveWorkspaceAdmin: false },
    ),
  );

  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Database error deleting user");
});

test("an empty Auth error keeps a stable HTTP 500 fallback", async () => {
  const result = await readResponse(createDeleteAccountFailureResponse(null));

  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Impossibile eliminare il profilo.");
});

test("delete-account rechecks current admin memberships after Auth deletion fails", async () => {
  const handler = await readFile(
    "supabase/functions/delete-account/index.ts",
    "utf8",
  );
  const failureStart = handler.indexOf("if (deleteError)");
  const successStart = handler.indexOf("return Response.json({ success: true })", failureStart);

  assert.ok(failureStart >= 0, "Auth delete failure branch must exist.");
  assert.ok(successStart > failureStart, "Auth success response must follow the failure branch.");

  const failureBranch = handler.slice(failureStart, successStart);
  assert.match(
    handler,
    /createDeleteAccountFailureResponse/,
    "The Edge Function must use the tested response helper.",
  );
  assert.match(
    failureBranch,
    /hasLastActiveWorkspaceAdmin\(ctx\.supabaseAdmin,\s*userId\)/,
    "The failure branch must re-evaluate the invariant with the service-role SQL snapshot RPC.",
  );
  assert.match(
    handler,
    /hasLastActiveWorkspaceAdmin\(ctx\.supabaseAdmin,\s*userId\)/,
    "The pre-delete and post-failure checks must use the single-statement SQL RPC.",
  );
  assert.doesNotMatch(
    handler,
    /from\(["']workspace_members["']\)/,
    "The Edge Function must not use a paginated client-side workspace membership scan.",
  );
  assert.match(
    failureBranch,
    /lastActiveWorkspaceAdmin/,
    "The verified post-failure state must control the conflict response.",
  );
});
