import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const shell = await readFile(new URL("./test-work-progress-sal-atomicity-postgres.sh", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/sal-atomicity-postgres.yml", import.meta.url), "utf8");

assert.match(shell, /\*localhost\*\|\*127\.0\.0\.1\*\|\*::1\*/, "runtime regression must reject non-loopback database URLs");
assert.match(shell, /supabase\.co/, "runtime regression must reject Supabase endpoints");
assert.match(shell, /SET ROLE authenticated/, "race must execute through the authenticated RPC grant");
assert.match(shell, /FIRST_SAL_INSERT_HELD[\s\S]*pg_sleep\(3\)/, "first transaction must hold the parent lock while the second starts");
assert.match(shell, /create_condominium_work_progress_atomic[\s\S]*create_condominium_work_progress_atomic/, "two concurrent SAL creation RPC calls must be exercised");
assert.match(shell, /Il totale dei SAL supera l'importo approvato del lavoro/, "second concurrent SAL must be rejected by the cumulative cap");
assert.match(shell, /count\(\*\)[\s\S]*<> 1[\s\S]*sum\(amount\)[\s\S]*<> 60/, "only one SAL and the approved cumulative amount may persist");
assert.match(workflow, /image: postgres:17/, "concurrency regression must run on PostgreSQL 17");
assert.match(workflow, /bash scripts\/test-work-progress-sal-atomicity-postgres\.sh/, "PostgreSQL 17 workflow must execute the isolated runtime test");
console.log("PASS SAL PostgreSQL 17 concurrency contract.");
