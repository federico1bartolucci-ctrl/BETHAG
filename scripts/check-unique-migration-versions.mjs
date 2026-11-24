#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { validateMigrationFilenames } from "./migration-filename-validation.mjs";

const directory = "supabase/migrations";
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const { invalid, duplicates } = validateMigrationFilenames(files);

if (invalid.length || duplicates.length) {
  console.error("Migration filename validation failed.");
  for (const filename of invalid) console.error(`Invalid filename or calendar timestamp: ${filename}`);
  for (const [version, names] of duplicates) console.error(`Duplicate migration version ${version}: ${names.join(", ")}`);
  process.exit(1);
}

assert.equal(files.length, 28, `Expected 28 canonical migrations, found ${files.length}`);
console.log(`PASS: ${files.length} canonical migration files have valid, unique calendar timestamps.`);
