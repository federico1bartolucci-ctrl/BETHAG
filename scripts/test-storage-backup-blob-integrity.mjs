import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readAndVerifyBlobBody } from "./storage-backup-blob-integrity.mjs";

const script = await readFile("scripts/backup-supabase-storage-to-r2.mjs", "utf8");
const expected = Buffer.from("BETHAG immutable backup payload");
const sha = createHash("sha256").update(expected).digest("hex");
const body = (bytes) => ({ transformToByteArray: async () => new Uint8Array(bytes) });
assert.deepEqual(await readAndVerifyBlobBody(body(expected), sha, expected.length, "blob"), expected);
const corrupted = Buffer.from(expected); corrupted[0] ^= 0xff;
await assert.rejects(()=>readAndVerifyBlobBody(body(corrupted),sha,expected.length,"blob"),/SHA-256 mismatch/);
await assert.rejects(()=>readAndVerifyBlobBody(body(Buffer.from("short")),sha,expected.length,"blob"),/size mismatch/);
await assert.rejects(()=>readAndVerifyBlobBody(null,sha,expected.length,"blob"),/no readable body/);
await assert.rejects(()=>readAndVerifyBlobBody({transformToByteArray:async()=>{throw new Error("simulated R2 read failure");}},sha,expected.length,"blob"),/simulated R2 read failure/);
assert.equal(script.split("readAndVerifyBlobBody(").length-1,2,"both reused and new blobs must be read back");
assert.ok(script.indexOf("readAndVerifyBlobBody")<script.indexOf("manifestObjects.push"),"verify before manifest reference");
console.log("PASS: Storage backup blob-integrity runtime regression");
