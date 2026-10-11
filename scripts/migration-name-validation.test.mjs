import test from "node:test";
import assert from "node:assert/strict";
import { validateMigrationNames } from "./migration-name-validation.mjs";

test("accepts correctly named migration files", () => {
  assert.deepEqual(
    validateMigrationNames([
      "20260928021707_initial_bethag_backend.sql",
      "20261011120000_reconcile_function_body_and_acl_parity.sql",
    ]),
    [],
  );
});

test("rejects a filename without a 14-digit version prefix", () => {
  const errors = validateMigrationNames(["initial_bethag_backend.sql"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Nome migrazione non valido/);
});

test("rejects a malformed suffix", () => {
  const errors = validateMigrationNames(["20261011120000_Reconcile.sql"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Nome migrazione non valido/);
});

test("rejects duplicate timestamps even when descriptions differ", () => {
  const errors = validateMigrationNames([
    "20261011120000_reconcile_schema.sql",
    "20261011120000_reconcile_functions.sql",
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Timestamp duplicato 20261011120000/);
});

test("rejects an empty migration inventory", () => {
  const errors = validateMigrationNames([]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Nessuna migrazione SQL/);
});
