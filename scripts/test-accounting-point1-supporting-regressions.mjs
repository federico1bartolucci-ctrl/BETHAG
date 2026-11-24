import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("Accounting point 1 PostgreSQL runtime regressions: SKIPPED (DATABASE_URL not set)");
  process.exit(0);
}

const result = spawnSync("bash", ["scripts/test-accounting-point1-supporting-regressions.sh"], {
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Accounting point 1 PostgreSQL runtime regressions: PASS");
