import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SDK_PACKAGE = "@aws-sdk/client-s3";
const SDK_VERSION = "3.1178.0";
const workingDirectory = await mkdtemp(join(tmpdir(), "bethag-r2-sdk-audit-"));

function runNpm(args) {
  const result = spawnSync("npm", args, {
    cwd: workingDirectory,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

try {
  await writeFile(
    join(workingDirectory, "package.json"),
    JSON.stringify({
      name: "bethag-r2-sdk-audit",
      version: "1.0.0",
      private: true,
      dependencies: { [SDK_PACKAGE]: SDK_VERSION },
    }, null, 2) + "\n",
  );

  const install = runNpm(["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  if (install.status !== 0) {
    throw new Error("Unable to install the isolated R2 SDK dependency tree:\n" + install.stderr);
  }

  const audit = runNpm(["audit", "--json"]);
  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    throw new Error("npm audit did not return valid JSON:\n" + audit.stdout + "\n" + audit.stderr);
  }

  const counts = report.metadata?.vulnerabilities;
  if (!counts) throw new Error("npm audit report did not include vulnerability counts.");

  console.log(
    "R2 SDK audit " + SDK_PACKAGE + "@" + SDK_VERSION + ": " +
    JSON.stringify({
      info: counts.info || 0,
      low: counts.low || 0,
      moderate: counts.moderate || 0,
      high: counts.high || 0,
      critical: counts.critical || 0,
      total: counts.total || 0,
    }),
  );

  const blocking = Object.entries(report.vulnerabilities || {}).filter(([, item]) =>
    item.severity === "high" || item.severity === "critical"
  );
  if (blocking.length) {
    for (const [name, item] of blocking) {
      console.error(
        "BLOCKED " + item.severity + " " + name +
        " range=" + item.range +
        " fixAvailable=" + JSON.stringify(item.fixAvailable ?? null),
      );
    }
    process.exitCode = 1;
  } else {
    console.log("PASS: isolated R2 SDK dependency tree has no high or critical npm advisories.");
  }
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}
