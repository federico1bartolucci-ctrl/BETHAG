import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test(
  "PostgreSQL runtime: every SAL row blocks work deletion regardless of scope mismatch",
  {
    skip: process.env.DATABASE_URL
      ? false
      : "DATABASE_URL is supplied by the isolated PostgreSQL 17 workflow",
  },
  () => {
    const result = spawnSync(
      "bash",
      ["scripts/test-work-delete-with-sal-guard.sh"],
      {
        encoding: "utf8",
        env: process.env,
      },
    );

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.error, undefined, output);
    assert.equal(result.status, 0, output);
    assert.match(output, /LEGACY DEFECT REPRODUCED: scope-mismatched SAL rows were cascade-deleted/);
    assert.match(
      output,
      /PASS: work deletion guard blocks every cascading SAL child, including workspace\/condominium scope mismatches under RLS; empty work remains deletable/,
    );
  },
);
