import assert from "node:assert/strict";
import { sourceObjectSignature } from "./storage-backup-source-signature.mjs";

const original = [{ Key: "condominium-a/document.pdf", Size: 4096, ETag: '"same-etag"', LastModified: new Date("2026-11-25T10:00:00.000Z") }];
const unchanged = [{ Key: "condominium-a/document.pdf", Size: 4096, ETag: '"same-etag"', LastModified: "2026-11-25T10:00:00.000Z" }];
const metadataOnlyRevision = [{ Key: "condominium-a/document.pdf", Size: 4096, ETag: '"same-etag"', LastModified: "2026-11-25T10:01:00.000Z" }];

const legacy = (items) => JSON.stringify(items.filter((item) => item.Key && !item.Key.endsWith("/")).map((item) => [item.Key, item.Size, item.ETag || null]).sort((a,b) => a[0].localeCompare(b[0])));
assert.equal(legacy(original), legacy(metadataOnlyRevision), "reproduce the old guard missing metadata-only revisions");
assert.equal(sourceObjectSignature(original), sourceObjectSignature(unchanged), "Date and ISO representations must match");
assert.notEqual(sourceObjectSignature(original), sourceObjectSignature(metadataOnlyRevision), "LastModified changes must invalidate the snapshot");
assert.notEqual(sourceObjectSignature(original), sourceObjectSignature([{...original[0], Size:4097}]));
assert.notEqual(sourceObjectSignature(original), sourceObjectSignature([{...original[0], ETag:'"new-etag"'}]));
assert.equal(sourceObjectSignature([...original,{Key:"folder/",Size:0,ETag:null,LastModified:undefined}]),sourceObjectSignature(original));
assert.throws(()=>sourceObjectSignature([{...original[0],LastModified:undefined}]),/valid LastModified timestamp/);
assert.throws(()=>sourceObjectSignature([{...original[0],LastModified:null}]),/valid LastModified timestamp/);
assert.throws(()=>sourceObjectSignature([{...original[0],Size:NaN}]),/valid size/);
assert.throws(()=>sourceObjectSignature([{...original[0],Size:null}]),/valid size/);
console.log("PASS: Storage backup source-signature runtime regression");
