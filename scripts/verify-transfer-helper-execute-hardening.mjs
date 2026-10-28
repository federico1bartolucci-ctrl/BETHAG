import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [remediation, canonicalAcl, invokerPathFix] = await Promise.all([
  readFile("supabase/migrations/20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql", "utf8"),
  readFile("supabase/migrations/20261022233440_align_public_function_execute.sql", "utf8"),
  readFile("supabase/migrations/20261027110000_repair_service_role_transfer_invoker_path.sql", "utf8"),
]);

for (const schema of ["private", "public"]) {
  const revoke = "REVOKE EXECUTE ON FUNCTION " + schema + ".check_condominium_member_transfer_closure(uuid) FROM PUBLIC, anon;";
  const grant = "GRANT EXECUTE ON FUNCTION " + schema + ".check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;";
  assert.ok(remediation.includes(revoke), schema + " transfer closure helper must not be executable by PUBLIC or anon.");
  assert.ok(remediation.includes(grant), schema + " transfer closure helper must remain callable by the intended application roles.");
}
assert.doesNotMatch(remediation, /GRANT EXECUTE ON FUNCTION .* TO PUBLIC/i);
assert.match(canonicalAcl, /GRANT EXECUTE ON FUNCTION public\.normalize_zero_ownership_owner\(\) TO PUBLIC;/);
assert.match(canonicalAcl, /GRANT EXECUTE ON FUNCTION public\.preserve_closing_condominium_member_history\(\) TO PUBLIC;/);
assert.doesNotMatch(canonicalAcl, /GRANT EXECUTE ON FUNCTION (?:private|public)\.check_condominium_member_transfer_closure\(uuid\) TO PUBLIC;/);

assert.match(invokerPathFix, /GRANT USAGE ON SCHEMA private TO service_role;/);
assert.match(invokerPathFix, /GRANT EXECUTE ON FUNCTION private\.close_condominium_member_transfer\(uuid\) TO service_role;/);
assert.match(invokerPathFix, /REVOKE EXECUTE ON FUNCTION private\.close_condominium_member_transfer\(uuid\) FROM PUBLIC, anon;/);

console.log(JSON.stringify({
  transfer_helper_execute_hardening: "PASS",
  helper_functions_public_execute: false,
  trigger_function_public_execute_exceptions_preserved: 2,
}, null, 2));
