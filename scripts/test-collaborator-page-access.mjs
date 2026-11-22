import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canCollaboratorAccessPage } from "../src/lib/collaboratorPageAccess.mjs";

const modulePermissions = ["condomini", "documenti", "scadenze", "assemblee", "fornitori", "attivita", "comunicazioni", "ai", "portale"];
for (const permission of modulePermissions) {
  assert.equal(canCollaboratorAccessPage(permission, [permission]), true, `${permission} should allow its page`);
  assert.equal(canCollaboratorAccessPage(permission, []), false, `${permission} should deny without permission`);
}
assert.equal(canCollaboratorAccessPage("lavori", ["attivita"]), true);
assert.equal(canCollaboratorAccessPage("lavori", ["fornitori"]), false);
for (const page of ["archivio", "contabilita", "registro", "abbonamento", "amministratore", "collaboratori"]) {
  assert.equal(canCollaboratorAccessPage(page, modulePermissions), false, `${page} is administrator-only`);
}
for (const page of ["homepage", "impostazioni", "aiuto"]) {
  assert.equal(canCollaboratorAccessPage(page, []), true, `${page} is neutral`);
}
assert.equal(canCollaboratorAccessPage("new-unmapped-page", modulePermissions), false, "Unknown pages must fail closed");

const app = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(app, /import \{ canCollaboratorAccessPage \} from "\.\/lib\/collaboratorPageAccess\.mjs";/, "App must import the tested helper");
assert.match(app, /const hasRolePermission = canCollaboratorAccessPage\(target,\s*collaboratorPermissions\);/, "Collaborator routing must use the tested permission helper");
assert.match(app, /page === "registro" && isAdministrator && \(/, "Register page must be render-gated for admins");
assert.match(app, /\{isAdministrator && \(\s*<NavButton\s+active=\{page === "registro"\}/s, "Register navigation must be admin-only");
assert.match(app, /if \(authHydrated && sessionRole && page === "registro" && !isAdministrator\)/, "Persisted unauthorized register route must redirect");
console.log("Collaborator page-access regression: PASS");
