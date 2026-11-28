import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const archiveDir = path.join(root, "supabase", "recovered-production-ledger");
const manifestPath = path.join(archiveDir, "MANIFEST.csv");
const candidateDir = path.join(root, "supabase", "replay-candidate");

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  if (quoted) throw new Error("Malformed CSV: unterminated quoted field");
  return fields;
}

const csv = await readFile(manifestPath, "utf8");
const lines = csv.trimEnd().split(/\r?\n/);
const expectedHeader = ["version", "name", "file", "statement_count", "sql_chars", "payload_md5"];
if (parseCsvLine(lines[0]).join("|") !== expectedHeader.join("|")) {
  throw new Error("Unexpected migration archive manifest header");
}

const seenVersions = new Set();
const seenFiles = new Set();
const failures = [];
let verified = 0;
let previousVersion = "";

for (const [index, line] of lines.slice(1).entries()) {
  const [version, name, file, statementCountText, sqlCharsText, expectedMd5] = parseCsvLine(line);
  const row = index + 2;
  if (!/^\d{14}$/.test(version)) {
    failures.push(`row ${row}: invalid version ${version}`);
    continue;
  }
  if (seenVersions.has(version)) failures.push(`row ${row}: duplicate version ${version}`);
  seenVersions.add(version);
  if (previousVersion && version <= previousVersion) failures.push(`row ${row}: versions are not strictly increasing (${previousVersion} then ${version})`);
  previousVersion = version;
  if (seenFiles.has(file)) failures.push(`row ${row}: duplicate archive file ${file}`);
  seenFiles.add(file);
  if (path.basename(file) !== file || !file.startsWith(`${version}_`) || !file.endsWith(".sql")) {
    failures.push(`row ${row}: unsafe or incorrectly versioned filename ${file}`);
    continue;
  }
  if (Number(statementCountText) !== 1) {
    failures.push(`row ${row}: expected exactly one recorded SQL statement for ${version}`);
    continue;
  }

  try {
    const sql = await readFile(path.join(archiveDir, file), "utf8");
    const actualMd5 = createHash("md5").update(sql, "utf8").digest("hex");
    const actualChars = [...sql].length;
    const candidateSql = await readFile(path.join(candidateDir, file), "utf8");
    const candidateMd5 = createHash("md5").update(candidateSql, "utf8").digest("hex");
    if (candidateMd5 !== expectedMd5) failures.push(`row ${row}: replay candidate differs from recovered archive for ${file}`);
    if (actualMd5 !== expectedMd5) failures.push(`row ${row}: MD5 mismatch for ${file}`);
    if (actualChars !== Number(sqlCharsText)) failures.push(`row ${row}: SQL character count mismatch for ${file}`);
    if (!sql.trim()) failures.push(`row ${row}: empty SQL payload for ${file}`);
    if (actualMd5 === expectedMd5 && actualChars === Number(sqlCharsText) && sql.trim()) verified += 1;
  } catch (error) {
    failures.push(`row ${row}: cannot read ${file}: ${error.message}`);
  }
}

const archiveSqlFiles = (await readdir(archiveDir)).filter((file) => file.endsWith(".sql"));
const candidateSqlFiles = (await readdir(candidateDir)).filter((file) => file.endsWith(".sql"));
if (archiveSqlFiles.length !== lines.length - 1) {
  failures.push(`archive contains ${archiveSqlFiles.length} SQL files but manifest contains ${lines.length - 1} rows`);
}
if (candidateSqlFiles.length !== lines.length - 1) failures.push(`replay candidate contains ${candidateSqlFiles.length} SQL files but manifest contains ${lines.length - 1} rows`);
if (lines.length - 1 !== 247) failures.push(`expected 247 manifest rows, found ${lines.length - 1}`);

if (failures.length) {
  console.error(`Recovered Production migration archive validation FAILED: ${failures.length} issue(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Recovered Production migration archive validation PASS: ${verified}/247 archive payloads and replay-candidate copies match Production-ledger MD5 and character counts; versions are unique and ordered.`);
}
