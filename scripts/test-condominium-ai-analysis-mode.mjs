import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeCondominiumDocumentsByStorageMode } from "../src/lib/condominiumAiDocumentMode.ts";

const selectedFiles = [{ name: "condominio.pdf", type: "application/pdf" }];
const analysisFiles = [{ filename: "condominio.pdf", storagePath: "workspace/condominio.pdf", mimeType: "application/pdf" }];
let storedCalls = 0;
let temporaryCalls = 0;
let storedArgs;
let temporaryArgs;

const analyzeStored = async (workspaceId, files) => {
  storedCalls += 1;
  storedArgs = { workspaceId, files };
  return { source: "stored" };
};
const analyzeTemporary = async (workspaceId, files) => {
  temporaryCalls += 1;
  temporaryArgs = { workspaceId, files };
  return { source: "temporary" };
};

const analysisDraft = await analyzeCondominiumDocumentsByStorageMode(
  "workspace-1", selectedFiles, "analysis", [], analyzeStored, analyzeTemporary,
);
assert.deepEqual(analysisDraft, { source: "temporary" });
assert.equal(temporaryCalls, 1, "analysis-only mode must invoke the temporary-upload AI path");
assert.deepEqual(temporaryArgs, { workspaceId: "workspace-1", files: selectedFiles });
assert.equal(storedCalls, 0, "analysis-only mode must not call the stored-document path");

const storedDraft = await analyzeCondominiumDocumentsByStorageMode(
  "workspace-1", selectedFiles, "both", analysisFiles, analyzeStored, analyzeTemporary,
);
assert.deepEqual(storedDraft, { source: "stored" });
assert.equal(storedCalls, 1, "both mode must invoke the stored-document AI path");
assert.deepEqual(storedArgs, { workspaceId: "workspace-1", files: analysisFiles });
assert.equal(temporaryCalls, 1, "both mode must not invoke temporary-upload path");

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(mainSource, /analyzeCondominiumDocumentsByStorageMode\(/, "main flow must use the tested mode dispatcher");
assert.match(mainSource, /analyzeCondominiumDocumentsWithAI/, "analysis-only mode must use the temporary upload-and-cleanup AI helper");
assert.ok(packageJson.scripts.test.includes("test-condominium-ai-analysis-mode.mjs"), "regression test must be included in npm test");
console.log("Condominium AI analysis-only storage mode regression checks passed.");
