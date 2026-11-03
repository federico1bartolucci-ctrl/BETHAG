import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const manifestPath = "supabase/recovered-production-ledger/MANIFEST.csv";
const migrationDir = "supabase/migrations";
const lines = (await readFile(manifestPath, "utf8")).trimEnd().split(/\r?\n/);
const header = lines.shift();
assert.equal(header, "version,name,file,statement_count,sql_chars,payload_md5");

const rows = lines.map((line) => {
  const match = line.match(/^(\d{14}),"((?:[^"]|"")*)","([^"]+)",(\d+),(\d+),([a-f0-9]{32})$/);
  assert.ok(match, "Malformed manifest row: " + line);
  return { version: match[1], name: match[2].replace(/""/g, '"'), file: match[3], statements: Number(match[4]), chars: Number(match[5]), md5: match[6] };
});
assert.equal(rows.length, 247, "Expected exactly 247 Production ledger rows");
assert.equal(new Set(rows.map((row) => row.version)).size, 247, "Production ledger versions must be unique");

const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
const expected = rows.map((row) => row.file).sort();
assert.deepEqual(files, expected, "Deployable historical migration directory must contain exactly the 247 recovered Production payloads");

for (const row of rows) {
  assert.match(row.file, new RegExp("^" + row.version + "_.*\\.sql$"), "Migration filename/version mismatch: " + row.file);
  assert.equal(row.statements, 1, "Unexpected recorded statement count for " + row.version);
  const sql = await readFile(path.join(migrationDir, row.file), "utf8");
  const md5 = createHash("md5").update(sql, "utf8").digest("hex");
  assert.equal(md5, row.md5, "SQL payload MD5 differs from live Production manifest for " + row.version);
  assert.equal([...sql].length, row.chars, "SQL character count differs from live Production manifest for " + row.version);
  const archived = await readFile(path.join("supabase/recovered-production-ledger", row.file), "utf8");
  assert.equal(sql, archived, "Deployable copy differs from the immutable recovered archive for " + row.version);
}

console.log("PASS: exactly 247 unique, ordered Production versions are present in supabase/migrations.");
console.log("PASS: all 247 SQL files match the recovered archive, database-captured MD5 values and character counts.");
console.log("PASS: no duplicate timestamp prefixes and no extra migration files.");
