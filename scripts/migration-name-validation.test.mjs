import test from "node:test";
import assert from "node:assert/strict";
import { validateMigrationNames } from "./migration-name-validation.mjs";

test("accepts valid migration names with unique 14-digit versions", () => {
  assert.deepEqual(
    validateMigrationNames([
      "20261021090000_create_example.sql",
      "20261021090001_add_example_index.sql",
    ]),
    [],
  );
});

test("rejects duplicate migration timestamps and reports both files", () => {
  const errors = validateMigrationNames([
    "20261021090000_create_example.sql",
    "20261021090000_add_example_index.sql",
  ]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Timestamp duplicato 20261021090000/);
  assert.match(errors[0], /create_example\.sql/);
  assert.match(errors[0], /add_example_index\.sql/);
});

test("rejects filenames that do not use the timestamp_description.sql format", () => {
  const errors = validateMigrationNames([
    "202610210900_create_example.sql",
    "not-a-migration.sql",
  ]);

  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => error.includes("Nome migrazione non valido")));
});

test("rejects an empty migrations directory", () => {
  assert.deepEqual(
    validateMigrationNames([]),
    ["Nessuna migrazione SQL trovata in supabase/migrations"],
  );
});
