import assert from "node:assert/strict";

export function assertLiveLedgerAclEvidenceMatchesSource(approval, approvedSourceSha) {
  assert.match(approvedSourceSha ?? "", /^[0-9a-f]{40}$/,
    "STOP: exact approved source SHA is required for QA and internal technical-review binding.");
  assert.equal(approval?.qa_tested_commit_sha, approvedSourceSha,
    "STOP: APP-01..APP-15 QA evidence must cover the exact owner-approved source SHA.");

  const review = approval?.technical_review;
  assert.equal(review?.review_type, "INTERNAL_SELF_REVIEW",
    "STOP: technical review must be explicitly classified as an internal self-review.");
  assert.equal(review?.status, "PASS_WITH_DISCLOSED_CONFLICT",
    "STOP: internal technical review must pass with its conflict disclosed.");
  assert.equal(review?.independent, false,
    "STOP: an internal self-review must not be represented as independent.");
  assert.equal(review?.conflict_disclosed, true,
    "STOP: the non-independent review limitation must be explicitly disclosed.");
  assert.equal(review?.reviewed_commit_sha, approvedSourceSha,
    "STOP: internal technical review must cover the exact owner-approved source SHA.");
  assert.ok(review?.reviewer && review?.evidence_reference,
    "STOP: internal technical review must identify its author and evidence.");
  return true;
}
