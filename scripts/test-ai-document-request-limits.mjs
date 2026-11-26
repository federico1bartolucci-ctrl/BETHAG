import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AI_DOCUMENT_MAX_FILES,
  AI_DOCUMENT_MAX_FILE_BYTES,
  AI_DOCUMENT_MAX_TOTAL_BYTES,
  addAiDocumentBlobSize,
  validateAiDocumentRequestFiles,
} from "../supabase/functions/_shared/ai-document-request-limits.js";

const empty = validateAiDocumentRequestFiles([]);
assert.equal(empty.allowed, false);
assert.equal(empty.status, 400);
assert.equal(empty.code, "AI_DOCUMENTS_REQUIRED");

const atFileLimit = validateAiDocumentRequestFiles(
  Array.from({ length: AI_DOCUMENT_MAX_FILES }, (_, index) => ({ storagePath: `workspace/${index}.pdf` })),
);
assert.equal(atFileLimit.allowed, true);

const overFileLimit = validateAiDocumentRequestFiles(
  Array.from({ length: AI_DOCUMENT_MAX_FILES + 1 }, (_, index) => ({ storagePath: `workspace/${index}.pdf` })),
);
assert.equal(overFileLimit.allowed, false);
assert.equal(overFileLimit.status, 413);
assert.equal(overFileLimit.code, "AI_DOCUMENT_COUNT_LIMIT");

const duplicateFiles = [
  { storagePath: "workspace/documents/invoice-17.pdf", filename: "invoice-17.pdf" },
  { storagePath: "workspace/documents/invoice-17.pdf", filename: "invoice-copy.pdf" },
];
const legacyCountOnlyValidation = Array.isArray(duplicateFiles) &&
  duplicateFiles.length > 0 &&
  duplicateFiles.length <= AI_DOCUMENT_MAX_FILES;
assert.equal(legacyCountOnlyValidation, true,
  "The previous count-only validator reproduced acceptance of duplicate Storage paths.");
const duplicatePaths = validateAiDocumentRequestFiles(duplicateFiles);
assert.equal(duplicatePaths.allowed, false);
assert.equal(duplicatePaths.status, 400);
assert.equal(duplicatePaths.code, "AI_DOCUMENT_DUPLICATE_STORAGE_PATH");

for (const invalidFiles of [
  [null],
  ["workspace/documents/invoice-17.pdf"],
  [{}],
  [{ storagePath: "" }],
  [{ storagePath: "   " }],
]) {
  const result = validateAiDocumentRequestFiles(invalidFiles);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 400);
  assert.ok(
    ["AI_DOCUMENT_FILE_INVALID", "AI_DOCUMENT_STORAGE_PATH_INVALID"].includes(result.code),
    `invalid file entry must fail closed: ${String(result.code)}`,
  );
}

const distinctPaths = validateAiDocumentRequestFiles([
  { storagePath: "workspace/documents/invoice-17.pdf" },
  { storagePath: "workspace/documents/minutes-18.pdf" },
]);
assert.equal(distinctPaths.allowed, true);

const oneFileAtLimit = addAiDocumentBlobSize(0, AI_DOCUMENT_MAX_FILE_BYTES);
assert.equal(oneFileAtLimit.allowed, true);
assert.equal(oneFileAtLimit.totalBytes, AI_DOCUMENT_MAX_FILE_BYTES);

const oneFileOverLimit = addAiDocumentBlobSize(0, AI_DOCUMENT_MAX_FILE_BYTES + 1);
assert.equal(oneFileOverLimit.allowed, false);
assert.equal(oneFileOverLimit.status, 413);
assert.equal(oneFileOverLimit.code, "AI_DOCUMENT_FILE_TOO_LARGE");

const firstHalf = addAiDocumentBlobSize(0, AI_DOCUMENT_MAX_FILE_BYTES);
const secondHalf = addAiDocumentBlobSize(firstHalf.totalBytes, AI_DOCUMENT_MAX_FILE_BYTES);
assert.equal(secondHalf.allowed, true);
assert.equal(secondHalf.totalBytes, AI_DOCUMENT_MAX_TOTAL_BYTES);

const aggregateOverLimit = addAiDocumentBlobSize(secondHalf.totalBytes, 1);
assert.equal(aggregateOverLimit.allowed, false);
assert.equal(aggregateOverLimit.status, 413);
assert.equal(aggregateOverLimit.code, "AI_DOCUMENT_BATCH_TOO_LARGE");

for (const invalidSize of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1024"]) {
  const result = addAiDocumentBlobSize(0, invalidSize);
  assert.equal(result.allowed, false, `invalid blob size ${String(invalidSize)} must be rejected`);
  assert.equal(result.status, 400);
  assert.equal(result.code, "AI_DOCUMENT_SIZE_INVALID");
}

const invalidTotal = addAiDocumentBlobSize(-1, 1);
assert.equal(invalidTotal.allowed, false);
assert.equal(invalidTotal.code, "AI_DOCUMENT_SIZE_INVALID");

for (const path of [
  "../supabase/functions/bethag-ai-document/index.ts",
  "../supabase/functions/bethag-ai-condominium/index.ts",
]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const countGate = source.indexOf("validateAiDocumentRequestFiles(files)");
  const planGate = source.indexOf("checkWorkspacePlanEntitlement(");
  const validationReturn = source.indexOf("if (!fileCountLimit.allowed)", countGate);
  const promptFileList = source.indexOf("files.map(", countGate);
  const download = source.indexOf('.storage.from("bethag-documents").download(');
  const sizeGate = source.indexOf("addAiDocumentBlobSize(totalDownloadedBytes, blob.size)");
  const upload = source.indexOf('fetch("https://api.openai.com/v1/files"');

  assert.ok(planGate >= 0, `${path} must enforce the server-side plan`);
  assert.ok(countGate > planGate, `${path} must check the request count after authorization and plan checks`);
  assert.ok(validationReturn > countGate, `${path} must return immediately when request-file validation fails`);
  assert.ok(promptFileList > validationReturn, `${path} must validate entries before reading their filenames`);
  assert.ok(download > validationReturn, `${path} must reject malformed or duplicate paths before Storage downloads`);
  assert.ok(sizeGate > download, `${path} must validate actual downloaded Blob sizes`);
  assert.ok(upload > sizeGate, `${path} must enforce byte limits before OpenAI uploads`);
  assert.match(source, /let totalDownloadedBytes\s*=\s*0/);
  assert.match(source, /totalDownloadedBytes\s*=\s*sizeCheck\.totalBytes/);
  assert.match(source, /sizeCheck\.status/);
  assert.match(source, /sizeCheck\.code/);
  assert.match(source, /blob\.size/);
  assert.doesNotMatch(source, /file\.size\s*\)\s*;/,
    "The server must not trust a client-supplied file size for the aggregate limit.");
}

assert.equal(AI_DOCUMENT_MAX_FILES, 20);
assert.equal(AI_DOCUMENT_MAX_FILE_BYTES, 50 * 1024 * 1024);
assert.equal(AI_DOCUMENT_MAX_TOTAL_BYTES, 100 * 1024 * 1024);

console.log("PASS AI document request bounds: 20-file limit enforced before Storage access.");
console.log("PASS AI document duplicate and malformed Storage paths rejected before downloads or OpenAI uploads.");
console.log("PASS AI document size limits: 50 MB per file and 100 MB aggregate use actual downloaded Blob sizes.");
console.log("PASS both AI Edge Functions reject oversized batches before any OpenAI file upload.");
