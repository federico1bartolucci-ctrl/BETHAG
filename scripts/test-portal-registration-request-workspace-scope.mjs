import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPortalRegistrationRequestWorkspaceView } from "../src/lib/portalRegistrationRequestWorkspaceState.ts";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

const workspaceAState = {
  workspaceId: "workspace-A",
  requests: [{ id: "request-from-A", workspace_id: "workspace-A" }],
  error: null,
};

assert.deepEqual(
  getPortalRegistrationRequestWorkspaceView(workspaceAState, "workspace-A"),
  { requests: workspaceAState.requests, error: null },
  "the current workspace may see its own registration requests",
);

assert.deepEqual(
  getPortalRegistrationRequestWorkspaceView(workspaceAState, "workspace-B"),
  { requests: [], error: null },
  "switching workspace must hide the previous workspace requests immediately",
);

const failedWorkspaceBState = {
  workspaceId: "workspace-B",
  requests: [],
  error: "Impossibile caricare le richieste di registrazione. Aggiorna la pagina e riprova.",
};

assert.deepEqual(
  getPortalRegistrationRequestWorkspaceView(failedWorkspaceBState, "workspace-B"),
  { requests: [], error: failedWorkspaceBState.error },
  "a failed current-workspace load must expose an error and no stale requests",
);

assert.deepEqual(
  getPortalRegistrationRequestWorkspaceView(failedWorkspaceBState, "workspace-A"),
  { requests: [], error: null },
  "an error from another workspace must not leak across workspace boundaries",
);

assert.deepEqual(
  getPortalRegistrationRequestWorkspaceView(workspaceAState, ""),
  { requests: [], error: null },
  "missing workspace context must fail closed",
);

assert.match(source, /getPortalRegistrationRequestWorkspaceView\(registrationRequestState, profile\.workspaceId\)/, "the active dashboard must derive visible requests from the current workspace");
assert.match(source, /setRegistrationRequestState\(\{ workspaceId, requests: \[\], error: null \}\)/, "the active effect must clear the prior snapshot for the requested workspace");
assert.match(source, /requests: combined as PortalRegistrationRequest\[\], error: null/, "successful loads must store the current workspace scope");
assert.match(source, /error: "Impossibile caricare le richieste di registrazione\./, "failed loads must store a visible current-workspace error");
assert.match(source, /registrationRequestsError=\{registrationRequestsError\}/, "the dashboard must receive the scoped load error");
assert.match(source, /isAdministrator && registrationRequestsError[\s\S]*?role="alert"/, "administrators must see a distinct accessible load error");
assert.match(source, /current\.workspaceId === profile\.workspaceId/, "approval removal must not mutate another workspace snapshot");
assert.ok(packageJson.scripts.test.includes("test-portal-registration-request-workspace-scope.mjs"), "workspace-isolation regression must run through npm test");

console.log("Portal-registration request workspace-isolation runtime regression: PASS");
