import assert from "node:assert/strict";
import { deleteTemporaryOpenAIFile } from "../supabase/functions/_shared/openai-file-cleanup.js";

let calls = 0;
const success = await deleteTemporaryOpenAIFile(async (url, init) => {
  calls += 1;
  assert.equal(url, "https://api.openai.com/v1/files/file_test");
  assert.equal(init.method, "DELETE");
  assert.equal(init.headers.Authorization, "Bearer sk-test");
  return { ok: true, status: 204 };
}, "sk-test", "file_test");
assert.deepEqual(success, { ok: true, status: 204, attempts: 1 });
assert.equal(calls, 1);

calls = 0;
const alreadyMissing = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  return { ok: false, status: 404 };
}, "sk-test", "file_missing");
assert.deepEqual(alreadyMissing, { ok: true, status: 404, attempts: 1 });
assert.equal(calls, 1);

calls = 0;
const retrySuccess = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  return calls === 1 ? { ok: false, status: 503 } : { ok: true, status: 204 };
}, "sk-test", "file_retry");
assert.deepEqual(retrySuccess, { ok: true, status: 204, attempts: 2 });
assert.equal(calls, 2);

calls = 0;
const permanentFailure = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  return { ok: false, status: 401 };
}, "sk-test", "file_auth");
assert.equal(permanentFailure.ok, false);
assert.equal(permanentFailure.status, 401);
assert.equal(permanentFailure.attempts, 1);
assert.equal(calls, 1);

calls = 0;
const exhaustedRetries = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  return { ok: false, status: 503 };
}, "sk-test", "file_server");
assert.equal(exhaustedRetries.ok, false);
assert.equal(exhaustedRetries.status, 503);
assert.equal(exhaustedRetries.attempts, 2);
assert.equal(calls, 2);

calls = 0;
const networkRecovery = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  if (calls === 1) throw new Error("network timeout");
  return { ok: true, status: 204 };
}, "sk-test", "file_network");
assert.deepEqual(networkRecovery, { ok: true, status: 204, attempts: 2 });
assert.equal(calls, 2);

calls = 0;
const missingCredentials = await deleteTemporaryOpenAIFile(async () => {
  calls += 1;
  throw new Error("fetch must not run");
}, "", "file_missing_key");
assert.equal(missingCredentials.ok, false);
assert.equal(missingCredentials.attempts, 0);
assert.equal(calls, 0);

console.log("PASS: temporary OpenAI file cleanup handles success, 404, transient retries, permanent failures, network errors, and missing credentials.");
