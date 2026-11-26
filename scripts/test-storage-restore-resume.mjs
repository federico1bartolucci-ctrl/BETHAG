import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertRestoreTargetEmpty } from "./storage-restore-target-empty.mjs";
import {
  listRestoreTargetObjects,
  inspectExistingRestoreTarget,
  restoreMissingObjects,
  assertRestoreTargetComplete,
} from "./storage-restore-target-inventory.mjs";

class ListObjectsV2Command {
  constructor(input) { this.input = input; }
}
class GetObjectCommand {
  constructor(input) { this.input = input; }
}
class PutObjectCommand {
  constructor(input) { this.input = input; }
}

const readBodyBytes = async (body) => {
  if (!body || typeof body.transformToByteArray !== "function") {
    throw new Error("missing fake object body");
  }
  return Buffer.from(await body.transformToByteArray());
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function createTargetClient({
  initial = [],
  pageSize = 1000,
  failPutAt = null,
  corruptPutKey = null,
} = {}) {
  const objects = new Map(initial.map(([key, bytes]) => [key, Buffer.from(bytes)]));
  const putKeys = [];
  const listInputs = [];
  let putCount = 0;

  return {
    objects,
    putKeys,
    listInputs,
    async send(command) {
      const input = command.input;
      if (command instanceof ListObjectsV2Command) {
        listInputs.push(input);
        const keys = [...objects.keys()].sort();
        const start = input.ContinuationToken === undefined ? 0 : Number(input.ContinuationToken);
        const limit = Math.min(input.MaxKeys || pageSize, pageSize);
        const pageKeys = keys.slice(start, start + limit);
        const truncated = start + limit < keys.length;
        return {
          IsTruncated: truncated,
          KeyCount: pageKeys.length,
          Contents: pageKeys.map((Key) => ({ Key })),
          ...(truncated ? { NextContinuationToken: String(start + limit) } : {}),
        };
      }
      if (command instanceof GetObjectCommand) {
        if (!objects.has(input.Key)) throw new Error("NoSuchKey: " + input.Key);
        const bytes = Buffer.from(objects.get(input.Key));
        return { Body: { transformToByteArray: async () => bytes } };
      }
      if (command instanceof PutObjectCommand) {
        putCount += 1;
        if (failPutAt !== null && putCount === failPutAt) {
          throw new Error("simulated connection loss during target write");
        }
        putKeys.push(input.Key);
        let bytes = Buffer.from(input.Body);
        if (corruptPutKey === input.Key) {
          bytes = Buffer.from(bytes);
          if (bytes.length) bytes[0] ^= 0xff;
        }
        objects.set(input.Key, bytes);
        return {};
      }
      throw new Error("Unexpected fake S3 command");
    },
  };
}

const payloads = [
  ["documents/a.txt", Buffer.from("alpha")],
  ["documents/b.txt", Buffer.from("bravo")],
  ["documents/c.txt", Buffer.from("charlie")],
];
const manifestObjects = payloads.map(([key, bytes]) => ({
  key,
  size: bytes.length,
  sha256: digest(bytes),
  content_type: "text/plain",
}));
const verifiedObjects = payloads.map(([key, bytes], index) => ({
  item: manifestObjects[index],
  bytes,
}));

// A normal multi-page target listing must consume every continuation token.
const paginatedClient = createTargetClient({ initial: payloads, pageSize: 1 });
const paginated = await listRestoreTargetObjects(
  paginatedClient, "recovery-bucket", ListObjectsV2Command, { maxKeys: 1 },
);
assert.deepEqual(paginated.map((item) => item.Key), payloads.map(([key]) => key));
assert.deepEqual(
  paginatedClient.listInputs.map((input) => input.ContinuationToken ?? null),
  [null, "1", "2"],
);

// A truncated response without a token, a repeated token, duplicate keys,
// and inconsistent page counts must never be accepted as a complete inventory.
const malformedClients = [
  {
    name: "missing continuation token",
    async send() { return { IsTruncated: true, KeyCount: 0, Contents: [] }; },
  },
  {
    name: "repeated continuation token",
    calls: 0,
    async send() {
      this.calls += 1;
      return this.calls === 1
        ? { IsTruncated: true, KeyCount: 0, Contents: [], NextContinuationToken: "loop" }
        : { IsTruncated: true, KeyCount: 0, Contents: [], NextContinuationToken: "loop" };
    },
  },
  {
    name: "duplicate key across pages",
    calls: 0,
    async send() {
      this.calls += 1;
      return this.calls === 1
        ? { IsTruncated: true, KeyCount: 1, Contents: [{ Key: "same.txt" }], NextContinuationToken: "next" }
        : { IsTruncated: false, KeyCount: 1, Contents: [{ Key: "same.txt" }] };
    },
  },
  {
    name: "inconsistent KeyCount",
    async send() { return { IsTruncated: false, KeyCount: 2, Contents: [{ Key: "one.txt" }] }; },
  },
];
for (const malformed of malformedClients) {
  await assert.rejects(
    () => listRestoreTargetObjects(malformed, "recovery-bucket", ListObjectsV2Command, { maxKeys: 1 }),
    /continuation token|duplicate object key|inconsistent KeyCount/,
    malformed.name,
  );
}

// Reproduce the old restore failure: after the first object is written, a
// connection failure leaves a partial target that the old empty-only gate rejects.
const target = createTargetClient({ pageSize: 2, failPutAt: 2 });
const initialState = await inspectExistingRestoreTarget({
  client: target,
  bucket: "recovery-bucket",
  ListObjectsV2Command,
  GetObjectCommand,
  manifestObjects,
  readBodyBytes,
});
assert.equal(initialState.existingKeys.size, 0);
await assert.rejects(
  () => restoreMissingObjects({
    client: target,
    bucket: "recovery-bucket",
    verifiedObjects,
    existingKeys: initialState.existingKeys,
    PutObjectCommand,
    GetObjectCommand,
    readBodyBytes,
  }),
  /simulated connection loss/,
);
assert.deepEqual([...target.objects.keys()], ["documents/a.txt"]);

const oldEmptyOnlyClient = {
  async send(command) {
    const key = [...target.objects.keys()][0];
    return {
      IsTruncated: false,
      KeyCount: key ? 1 : 0,
      Contents: key ? [{ Key: key }] : [],
    };
  },
};
await assert.rejects(
  () => assertRestoreTargetEmpty(oldEmptyOnlyClient, "recovery-bucket", ListObjectsV2Command),
  /Restore target bucket is not empty/,
  "the previous empty-only gate made the partial restore non-retryable",
);

// The new preflight accepts only exact, byte-verified objects from the same
// manifest, skips them, and writes only the missing objects.
const retryState = await inspectExistingRestoreTarget({
  client: target,
  bucket: "recovery-bucket",
  ListObjectsV2Command,
  GetObjectCommand,
  manifestObjects,
  readBodyBytes,
});
assert.deepEqual([...retryState.existingKeys], ["documents/a.txt"]);

const retryStats = await restoreMissingObjects({
  client: target,
  bucket: "recovery-bucket",
  verifiedObjects,
  existingKeys: retryState.existingKeys,
  PutObjectCommand,
  GetObjectCommand,
  readBodyBytes,
});
assert.deepEqual(retryStats, { written: 2, resumed: 1 });
assert.deepEqual(target.putKeys, [
  "documents/a.txt",
  "documents/b.txt",
  "documents/c.txt",
]);

const completed = await assertRestoreTargetComplete({
  client: target,
  bucket: "recovery-bucket",
  ListObjectsV2Command,
  manifestObjects,
});
assert.deepEqual(completed.map((item) => item.Key).sort(), manifestObjects.map((item) => item.key).sort());
assert.deepEqual(
  [...target.objects.entries()].map(([key, bytes]) => [key, digest(bytes)]).sort(([a], [b]) => a.localeCompare(b)),
  manifestObjects.map((item) => [item.key, item.sha256]).sort(([a], [b]) => a.localeCompare(b)),
);

// Existing folder markers, unknown keys, and same-key objects with wrong bytes
// remain hard failures; the resumable path never overwrites or deletes them.
for (const [key, bytes] of [
  ["empty-folder/", Buffer.alloc(0)],
  ["unrelated.txt", Buffer.from("unrelated")],
  ["documents/a.txt", Buffer.from("wrong")],
]) {
  const conflicting = createTargetClient({ initial: [[key, bytes]] });
  await assert.rejects(
    () => inspectExistingRestoreTarget({
      client: conflicting,
      bucket: "recovery-bucket",
      ListObjectsV2Command,
      GetObjectCommand,
      manifestObjects,
      readBodyBytes,
    }),
    /unexpected object|does not match the selected snapshot/,
  );
  assert.equal(conflicting.putKeys.length, 0);
}

// A successful PUT is not enough: a corrupt read-after-write must fail.
const corruptTarget = createTargetClient({ corruptPutKey: "documents/a.txt" });
const corruptState = await inspectExistingRestoreTarget({
  client: corruptTarget,
  bucket: "recovery-bucket",
  ListObjectsV2Command,
  GetObjectCommand,
  manifestObjects,
  readBodyBytes,
});
await assert.rejects(
  () => restoreMissingObjects({
    client: corruptTarget,
    bucket: "recovery-bucket",
    verifiedObjects,
    existingKeys: corruptState.existingKeys,
    PutObjectCommand,
    GetObjectCommand,
    readBodyBytes,
  }),
  /read-after-write SHA-256\/size verification/,
);

console.log("PASS: restore target pagination consumes all pages and fails closed on malformed/repeated tokens.");
console.log("PASS: interrupted R2 restore is reproducible and resumes only verified objects from the same manifest.");
console.log("PASS: folder markers, unexpected keys, mismatched bytes and corrupt read-after-write remain blocked.");
