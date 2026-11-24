import assert from "node:assert/strict";

export function assertLiveLedgerAclEvidenceMatchesSource(approval, approvedSourceSha) {
  assert.match(approvedSourceSha ?? "", /^[0-9a-f]{40}$/,
    "STOP: exact approved source SHA is required for QA and independent review binding.");
  assert.equal(approval?.qa_tested_commit_sha, approvedSourceSha,
    "STOP: APP-01..APP-15 QA evidence must cover the exact owner-approved source SHA.");
  assert.equal(approval?.independent_technical_review?.reviewed_commit_sha, approvedSourceSha,
    "STOP: independent technical review must cover the exact owner-approved source SHA.");
  return true;
}
