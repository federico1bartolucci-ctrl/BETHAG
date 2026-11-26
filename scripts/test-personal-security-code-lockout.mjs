import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261126030000_harden_personal_security_code_lifecycle.sql";
const migration = await readFile(migrationPath, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const mainSource = await readFile("src/main.tsx", "utf8");

assert.match(packageJson.scripts.test, /test-personal-security-code-lockout\.mjs/,
  "The personal security-code regression must run in npm test.");
assert.match(migration, /FOR UPDATE/,
  "Verification and code changes must serialize on the user's security-settings row.");
assert.match(migration, /PERSONAL_CODE_CHANGE_REQUIRES_VERIFICATION/,
  "The legacy set RPC must not replace or disable an enabled code.");
assert.match(migration, /personal_code_failed_attempts/);
assert.match(migration, /personal_code_locked_until/);
assert.match(migration, /INTERVAL '15 minutes'/);

const cardStart = mainSource.indexOf("function SecuritySettingsCard()");
const cardEnd = mainSource.indexOf("\nfunction ", cardStart + 20);
assert.ok(cardStart >= 0 && cardEnd > cardStart, "SecuritySettingsCard must be present.");
const card = mainSource.slice(cardStart, cardEnd);
const disableStart = card.indexOf("const disableCode = async");
const mfaStart = card.indexOf("const startMfaEnrollment", disableStart);
assert.ok(disableStart >= 0 && mfaStart > disableStart, "The disable-code handler must be present.");
const disableHandler = card.slice(disableStart, mfaStart);
assert.match(disableHandler, /rpc\("change_personal_security_code"/,
  "The UI must use the atomic server-side code-change RPC.");
assert.doesNotMatch(disableHandler, /rpc\("verify_personal_security_code"|rpc\("set_personal_security_code"/,
  "The UI must not split verification and disabling into separate RPC calls.");

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE SCHEMA extensions;
    CREATE SCHEMA private;
    CREATE ROLE anon;
    CREATE ROLE authenticated;

    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    -- Deterministic pgcrypto stand-in: this test exercises the database
    -- lockout/state machine, not bcrypt implementation or password hashing.
    CREATE OR REPLACE FUNCTION extensions.gen_salt(p_type text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $$ SELECT 'salt:test'::text $$;

    CREATE OR REPLACE FUNCTION extensions.crypt(p_password text, p_salt text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $crypt$
      SELECT CASE
        WHEN p_salt LIKE 'salt:%' THEN 'hash:' || pg_catalog.encode(pg_catalog.substring(pg_catalog.convert_to(p_password, 'UTF8'), 1, 72), 'hex')
        WHEN p_salt = 'hash:' || pg_catalog.encode(pg_catalog.substring(pg_catalog.convert_to(p_password, 'UTF8'), 1, 72), 'hex') THEN p_salt
        ELSE 'invalid-hash'
      END
    $crypt$;

    CREATE TABLE public.user_security_settings (
      user_id uuid PRIMARY KEY,
      personal_code_hash text,
      personal_code_enabled boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await db.exec(migration);

  const userId = "10000000-0000-4000-8000-000000000001";
  await db.query(
    "SELECT set_config('request.jwt.claim.sub', $1, false)",
    [userId],
  );

  const verify = async (code) => {
    const result = await db.query(
      "SELECT public.verify_personal_security_code($1) AS valid",
      [code],
    );
    return result.rows[0].valid;
  };
  const state = async () => {
    const result = await db.query(
      "SELECT personal_code_enabled, personal_code_hash, personal_code_failed_attempts, personal_code_locked_until, personal_code_locked_until > now() AS currently_locked FROM public.user_security_settings WHERE user_id = $1",
      [userId],
    );
    return result.rows[0];
  };
  const change = async (currentCode, newCode, enabled) => {
    const result = await db.query(
      "SELECT public.change_personal_security_code($1, $2, $3) AS changed",
      [currentCode, newCode, enabled],
    );
    return result.rows[0].changed;
  };

  // First-time setup remains available while the code is disabled.
  await db.query(
    "SELECT public.set_personal_security_code($1, true)",
    ["original-code"],
  );
  assert.equal(await verify("original-code"), true);

  // A direct call to the legacy setter cannot replace or disable an enabled code.
  await assert.rejects(
    () => db.query("SELECT public.set_personal_security_code($1, true)", ["attacker-reset"]),
    /PERSONAL_CODE_CHANGE_REQUIRES_VERIFICATION/,
  );
  await assert.rejects(
    () => db.query("SELECT public.set_personal_security_code(NULL, false)"),
    /PERSONAL_CODE_CHANGE_REQUIRES_VERIFICATION/,
  );
  assert.equal(await verify("original-code"), true);
  assert.equal(await verify("attacker-reset"), false);
  assert.equal(await verify("original-code"), true, "A successful verification resets the failed-attempt counter.");

  // Five failed attempts lock the verifier for 15 minutes.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal(await verify("wrong-code"), false);
  }
  let snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 4);
  assert.equal(snapshot.currently_locked, null);

  assert.equal(await verify("wrong-code"), false);
  snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 5);
  assert.equal(snapshot.currently_locked, true);
  assert.equal(await verify("original-code"), false,
    "A correct code must not bypass an active lockout.");

  // Expiry is deterministic in the test; the next correct attempt resets the counter.
  await db.query(
    "UPDATE public.user_security_settings SET personal_code_locked_until = now() - interval '1 second' WHERE user_id = $1",
    [userId],
  );
  assert.equal(await verify("original-code"), true);
  snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 0);
  assert.equal(snapshot.personal_code_locked_until, null);

  // Invalid new-code input is rejected before consuming a current-code attempt.
  await assert.rejects(
    () => change("original-code", "short", true),
    /nuovo codice personale deve contenere/,
  );
  await assert.rejects(
    () => change("original-code", "😀".repeat(20), true),
    /72 byte/,
  );
  snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 0);

  // A wrong current code is recorded; the correct current code atomically changes it.
  assert.equal(await change("wrong-code", "replacement-code", true), false);
  snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 1);
  assert.equal(await change("original-code", "replacement-code", true), true);
  snapshot = await state();
  assert.equal(snapshot.personal_code_failed_attempts, 0);
  assert.equal(snapshot.personal_code_locked_until, null);
  assert.equal(await verify("original-code"), false);
  assert.equal(await verify("replacement-code"), true);

  // Disabling is also atomic and requires the current code.
  assert.equal(await change("wrong-code", null, false), false);
  snapshot = await state();
  assert.equal(snapshot.personal_code_enabled, true);
  assert.equal(await change("replacement-code", null, false), true);
  snapshot = await state();
  assert.equal(snapshot.personal_code_enabled, false);
  assert.equal(snapshot.personal_code_hash, null);
  assert.equal(snapshot.personal_code_failed_attempts, 0);
  assert.equal(snapshot.personal_code_locked_until, null);

  // Once disabled, first-time setup can be performed again.
  await db.query(
    "SELECT public.set_personal_security_code($1, true)",
    ["re-enabled-code"],
  );
  assert.equal(await verify("re-enabled-code"), true);

  // Existing bcrypt hashes may have been created from a 6–32 character code
  // whose UTF-8 representation exceeded bcrypt's 72-byte input limit. Keep the
  // historical bcrypt truncation behavior for verification; only new codes
  // are rejected above 72 bytes.
  const legacyUserId = "10000000-0000-4000-8000-000000000002";
  const legacyCode = "😀".repeat(20);
  await db.query(
    "INSERT INTO public.user_security_settings (user_id, personal_code_hash, personal_code_enabled, personal_code_failed_attempts, personal_code_locked_until) VALUES ($1, extensions.crypt($2, 'salt:legacy'), true, 0, NULL)",
    [legacyUserId, legacyCode],
  );
  await db.query(
    "SELECT set_config('request.jwt.claim.sub', $1, false)",
    [legacyUserId],
  );
  assert.equal(await verify(legacyCode), true,
    "A legacy bcrypt code with more than 72 UTF-8 bytes remains verifiable.");
  await db.query(
    "SELECT set_config('request.jwt.claim.sub', $1, false)",
    [userId],
  );

  // The RPC is available to authenticated users but not anon.
  const acl = await db.query(
    "SELECT has_function_privilege('authenticated', 'public.change_personal_security_code(text,text,boolean)', 'EXECUTE') AS authenticated_can_change, has_function_privilege('anon', 'public.change_personal_security_code(text,text,boolean)', 'EXECUTE') AS anon_can_change"
  );
  assert.equal(acl.rows[0].authenticated_can_change, true);
  assert.equal(acl.rows[0].anon_can_change, false);

  console.log("Personal security-code lifecycle runtime regression: PASS");
  console.log("Direct setter bypass blocked; current-code change/disable verified atomically: PASS");
  console.log("Five failed attempts lock for 15 minutes; success resets the lockout: PASS");
  console.log("Authenticated-only RPC grants and UI wiring: PASS");
} finally {
  await db.close();
}
