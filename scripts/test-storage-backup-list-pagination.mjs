import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { listAllStorageObjects } from "./storage-backup-list-all.mjs";

class FakeListObjectsV2Command {
  constructor(input) {
    this.input = input;
  }
}

function fakeClient(pages) {
  const remaining = [...pages];
  const requests = [];
  return {
    requests,
    async send(command) {
      requests.push(command.input);
      if (remaining.length === 0) throw new Error("Unexpected extra ListObjectsV2 request");
      const page = remaining.shift();
      if (page instanceof Error) throw page;
      return page;
    },
  };
}

async function legacyListAll(client, bucket, prefix) {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(new FakeListObjectsV2Command({
      Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken,
    }));
    objects.push(...(page.Contents || []));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

// Reproduce the old defect: a truncated page without a token was accepted as complete.
const legacyPartial = await legacyListAll(
  fakeClient([{ IsTruncated: true, Contents: [{ Key: "only-first-page.pdf" }] }]),
  "bethag-documents",
);
assert.deepEqual(legacyPartial, [{ Key: "only-first-page.pdf" }],
  "the previous implementation incorrectly returned a partial inventory");
await assert.rejects(
  listAllStorageObjects(
    fakeClient([{ IsTruncated: true, Contents: [{ Key: "only-first-page.pdf" }] }]),
    "bethag-documents",
    undefined,
    FakeListObjectsV2Command,
  ),
  /omitted NextContinuationToken/,
);

// Normal pagination returns every page and explicitly requests the S3 maximum page size.
const normalClient = fakeClient([
  { IsTruncated: true, NextContinuationToken: "opaque-token-1", Contents: [{ Key: "a.pdf" }] },
  { IsTruncated: false, Contents: [{ Key: "b.pdf" }] },
]);
const allObjects = await listAllStorageObjects(
  normalClient, "bethag-documents", undefined, FakeListObjectsV2Command,
);
assert.deepEqual(allObjects.map((item) => item.Key), ["a.pdf", "b.pdf"]);
assert.equal(normalClient.requests[0].MaxKeys, 1000);
assert.equal(normalClient.requests[1].ContinuationToken, "opaque-token-1");
assert.equal("Prefix" in normalClient.requests[0], false);

// Empty inventories are valid when the service explicitly reports a final page.
assert.deepEqual(
  await listAllStorageObjects(
    fakeClient([{ IsTruncated: false }]), "bethag-documents", "", FakeListObjectsV2Command,
  ),
  [],
);

// A repeated token or a token cycle must fail rather than loop indefinitely.
await assert.rejects(
  listAllStorageObjects(fakeClient([
    { IsTruncated: true, NextContinuationToken: "token-a", Contents: [] },
    { IsTruncated: true, NextContinuationToken: "token-a", Contents: [] },
  ]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /repeated a continuation token/,
);
await assert.rejects(
  listAllStorageObjects(fakeClient([
    { IsTruncated: true, NextContinuationToken: "token-a", Contents: [] },
    { IsTruncated: true, NextContinuationToken: "token-b", Contents: [] },
    { IsTruncated: true, NextContinuationToken: "token-a", Contents: [] },
  ]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /repeated a continuation token/,
);

// Duplicate keys across pages make the inventory ambiguous and must fail closed.
await assert.rejects(
  listAllStorageObjects(fakeClient([
    { IsTruncated: true, NextContinuationToken: "token-a", Contents: [{ Key: "same.pdf" }] },
    { IsTruncated: false, Contents: [{ Key: "same.pdf" }] },
  ]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /duplicate object key/,
);

// Malformed pagination metadata or contents must never be interpreted as an empty final page.
await assert.rejects(
  listAllStorageObjects(fakeClient([{ Contents: [] }]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /omitted the IsTruncated boolean/,
);
await assert.rejects(
  listAllStorageObjects(fakeClient([{ IsTruncated: false, Contents: {} }]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /malformed Contents/,
);
await assert.rejects(
  listAllStorageObjects(fakeClient([{ IsTruncated: false, Contents: [{ Size: 12 }] }]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /without a valid key/,
);
await assert.rejects(
  listAllStorageObjects(fakeClient([new Error("S3 listing unavailable")]), "bethag-documents", undefined, FakeListObjectsV2Command),
  /S3 listing unavailable/,
);

const script = await readFile("scripts/backup-supabase-storage-to-r2.mjs", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(script.includes('import { listAllStorageObjects } from "./storage-backup-list-all.mjs";'));
assert.equal((script.match(/listAllStorageObjects\(/g) || []).length, 3,
  "source, destination and source-recheck inventories must all use the fail-closed paginator");
assert.ok(packageJson.scripts.test.includes("test-storage-backup-list-pagination.mjs"),
  "the pagination regression must run through npm test");

console.log("Storage backup pagination runtime regression: PASS");
console.log("Legacy truncated listing without continuation token reproduced: PASS");
console.log("All pages and continuation tokens are consumed: PASS");
console.log("Missing/repeated/cyclic tokens and duplicate keys fail closed: PASS");
