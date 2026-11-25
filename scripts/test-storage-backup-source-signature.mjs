import assert from "node:assert/strict";
import { sourceObjectSignature } from "./storage-backup-source-signature.mjs";

const original = [{
  Key: "condominium-a/document.pdf",
  Size: 4096,
  ETag: '"same-content-etag"',
  LastModified: new Date("2026-11-25T10:00:00.000Z")
}];

const unchanged = [{
  Key: "condominium-a/document.pdf",
  Size: 4096,
  ETag: '"same-content-etag"',
  LastModified: "2026-11-25T10:00:00.000Z"
}];

const metadataOnlyRevision = [{
  Key: "condominium-a/document.pdf",
  Size: 4096,
  ETag: '"same-content-etag"',
  LastModified: "2026-11-25T10:01:00.000Z"
}];

const legacySignature = (items) => JSON.stringify(items
  .filter((item) => item.Key && !item.Key.endsWith("/"))
  .map((item) => [item.Key, item.Size, item.ETag || null])
  .sort((a, b) => a[0].localeCompare(b[0])));

assert.equal(
  legacySignature(original),
  legacySignature(metadataOnlyRevision),
  "reproduce the old guard missing a metadata-only source revision"
);
assert.equal(
  sourceObjectSignature(original),
  sourceObjectSignature(unchanged),
  "Date and ISO timestamp representations of the same revision must match"
);
assert.notEqual(
  sourceObjectSignature(original),
  sourceObjectSignature(metadataOnlyRevision),
  "a changed LastModified timestamp must invalidate the in-progress snapshot"
);

assert.notEqual(
  sourceObjectSignature(original),
  sourceObjectSignature([{ ...original[0], Size: 4097 }]),
  "a changed source size must invalidate the snapshot"
);
assert.notEqual(
  sourceObjectSignature(original),
  sourceObjectSignature([{ ...original[0], ETag: '"new-content-etag"' }]),
  "a changed ETag must invalidate the snapshot"
);
assert.equal(
  sourceObjectSignature([
    ...original,
    { Key: "condominium-a/", Size: 0, ETag: null, LastModified: undefined }
  ]),
  sourceObjectSignature(original),
  "folder marker entries must not affect the object snapshot"
);
assert.throws(
  () => sourceObjectSignature([{ ...original[0], LastModified: undefined }]),
  /valid LastModified timestamp/,
  "missing LastModified must fail closed instead of weakening the consistency guard"
);
assert.throws(
  () => sourceObjectSignature([{ ...original[0], Size: Number.NaN }]),
  /valid size/,
  "invalid source sizes must fail closed"
);

console.log("PASS: Storage backup source-signature runtime regression");
console.log("PASS: metadata-only source revisions are detected through LastModified");
console.log("PASS: missing LastModified and invalid sizes fail closed");
