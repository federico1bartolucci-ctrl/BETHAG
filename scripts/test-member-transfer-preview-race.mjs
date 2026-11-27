import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPreviewRequestSequence,
  isMemberTransferPreviewCurrent,
} from "../src/lib/memberTransferPreview.mjs";

const requests = createPreviewRequestSequence();
const firstRequest = requests.begin();
const secondRequest = requests.begin();
assert.equal(requests.isCurrent(firstRequest), false, "a newer request makes the earlier request stale");
assert.equal(requests.isCurrent(secondRequest), true, "the latest request remains current");
requests.invalidate();
assert.equal(requests.isCurrent(secondRequest), false, "changing a preview input invalidates an in-flight request");

const preview = {
  unit_id: "unit-1",
  outgoing_member_id: "member-1",
  transfer_date: "2026-11-27",
  transfer_scope: "ownership_share",
  ownership_share: "25",
};
const selection = {
  unitId: "unit-1",
  outgoingId: "member-1",
  transferDate: "2026-11-27",
  transferScope: "ownership_share",
  ownershipShare: "25",
};
assert.equal(isMemberTransferPreviewCurrent(preview, selection), true);
for (const changed of [
  { ...selection, unitId: "unit-2" },
  { ...selection, outgoingId: "member-2" },
  { ...selection, transferDate: "2026-11-28" },
  { ...selection, transferScope: "whole_property" },
  { ...selection, ownershipShare: "30" },
]) {
  assert.equal(isMemberTransferPreviewCurrent(preview, changed), false,
    "preview must be stale when any transfer-defining input changes");
}
assert.equal(
  isMemberTransferPreviewCurrent(
    { ...preview, transfer_scope: "whole_property", ownership_share: null },
    { ...selection, transferScope: "whole_property", ownershipShare: "25" }
  ),
  true,
  "ownership share is irrelevant for whole-property transfers"
);

const source = await readFile(new URL("../src/MemberTransferPanel.tsx", import.meta.url), "utf8");
assert.match(source, /createPreviewRequestSequence/);
assert.match(source, /isMemberTransferPreviewCurrent\(preview/);
assert.match(source, /const requestId = previewRequestSequence\.current\.begin\(\)/);
assert.match(source, /if \(!previewRequestSequence\.current\.isCurrent\(requestId\)\) return;/);
assert.match(source, /if \(previewRequestSequence\.current\.isCurrent\(requestId\)\) setPreview\(merged\)/);
assert.match(source, /if \(previewRequestSequence\.current\.isCurrent\(requestId\)\) setBusy\(false\)/);
assert.match(source, /const previewOwnerIds = requestScope === "whole_property"/);
assert.match(source, /transfer_scope: requestScope/);
assert.match(source, /ownership_share: requestOwnershipShare/);
assert.match(source, /if \(!previewIsCurrent\)/);
assert.match(source, /makePreviewFor\(unitId, currentUnitOwners\[0\]\.id, currentDate, "whole_property", ""\)/, "whole-property owner selection must use the refreshed local date");
console.log("Member transfer stale-preview race and fingerprint regression: PASS");
