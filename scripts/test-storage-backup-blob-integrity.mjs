import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readAndVerifyBlobBody } from "./storage-backup-blob-integrity.mjs";

const script = await readFile("scripts/backup-supabase-storage-to-r2.mjs", "utf8");
const contract = await readFile("scripts/test-storage-backup-r2-contract.mjs", "utf8");

const expected = Buffer.from("BETHAG immutable backup payload");
const expectedSha256 = createHash("sha256").update(expected).digest("hex");
const expectedSize = expected.length;
const makeBody = (bytes) => ({ transformToByteArray: async () => new Uint8Array(bytes) });

const verified = await readAndVerifyBlobBody(
  makeBody(expected), expectedSha256, expectedSize, "backups/objects/example/generation"
);
assert.deepEqual(verified, expected, "a correct R2 blob must pass read-back verification");

const corruptedSameSize = Buffer.from(expected);
corruptedSameSize[0] ^= 0xff;
assert.equal(corruptedSameSize.length, expectedSize);
await assert.rejects(
  () => readAndVerifyBlobBody(
    makeBody(corruptedSameSize), expectedSha256, expectedSize, "backups/objects/example/generation"
  ),
  /SHA-256 mismatch/,
  "same-size corrupted bytes must not pass by retaining matching HEAD metadata"
);

await assert.rejects(
  () => readAndVerifyBlobBody(
    makeBody(Buffer.from("short")), expectedSha256, expectedSize, "backups/objects/example/generation"
  ),
  /size mismatch/,
  "truncated or extended R2 content must be rejected"
);

await assert.rejects(
  () => readAndVerifyBlobBody(null, expectedSha256, expectedSize, "backups/objects/example/generation"),
  /no readable body/,
  "a missing R2 body must fail closed"
);

await assert.rejects(
  () => readAndVerifyBlobBody(
    { transformToByteArray: async () => { throw new Error("simulated R2 read failure"); } },
    expectedSha256, expectedSize, "backups/objects/example/generation"
  ),
  /simulated R2 read failure/,
  "R2 read failures must propagate and prevent manifest publication"
);

assert.equal(
  (script.match(/readAndVerifyBlobBody\\(/g) || []).length,
  2,
  "both reused and newly uploaded blobs must be read back and verified"
);
assert.ok(
  script.indexOf("readAndVerifyBlobBody") < script.indexOf("manifestObjects.push"),
  "blob integrity must be verified before the manifest references the blob"
);
assert.match(contract, /readAndVerifyBlobBody/);

console.log("PASS: Storage backup blob-integrity runtime regression");
console.log("PASS: same-size corrupted R2 blobs fail SHA-256 verification");
console.log("PASS: both reused and newly uploaded blobs are read back before manifest publication");
console.log("PASS: missing bodies and R2 read errors fail closed");
