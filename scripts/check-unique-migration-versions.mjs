#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";

const directory = "supabase/migrations";
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const versions = new Map();
const invalid = [];

for (const filename of files) {
  const match = filename.match(/^(\\d{14})_(.+)\\.sql$/);
  if (!match) { invalid.push(filename); continue; }
  const version = match[1];
  versions.set(version, [...(versions.get(version) ?? []), filename]);
}

const duplicates = [...versions.entries()].filter(([, names]) => names.length > 1);
if (invalid.length || duplicates.length) {
  console.error("Migration filename validation failed.");
  for (const filename of invalid) console.error(`Invalid filename: ${filename}`);
  for (const [version, names] of duplicates) console.error(`Duplicate migration version ${version}: ${names.join(", ")}`);
  process.exit(1);
}
assert.equal(files.length, 23, `Expected 23 canonical migrations, found ${files.length}`);
console.log(`PASS: ${files.length} canonical migration files have valid, unique 14-digit versions.`);
