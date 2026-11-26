import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
const uploadStart = workflow.indexOf("uses: actions/upload-pages-artifact@v3");
const deployStart = workflow.indexOf("uses: actions/deploy-pages@v4");
assert.ok(uploadStart >= 0 && deployStart > uploadStart, "Pages upload and deploy steps must exist");

const uploadStep = workflow.slice(uploadStart, deployStart);
const deployStep = workflow.slice(deployStart, workflow.indexOf("\n# Use", deployStart) > 0 ? workflow.indexOf("\n# Use", deployStart) : undefined);
const artifactName = "github-pages-${{ github.run_attempt }}";

assert.ok(uploadStep.includes("name: " + artifactName), "upload must use a run-attempt-specific artifact name");
assert.ok(deployStep.includes("artifact_name: " + artifactName), "deploy must select the artifact for the same run attempt");
assert.ok(!workflow.includes("do not couple the artifact identity to run_id/run_attempt"), "obsolete default-artifact comment must be removed");
console.log("GitHub Pages artifact attempt-isolation regression passed.");
