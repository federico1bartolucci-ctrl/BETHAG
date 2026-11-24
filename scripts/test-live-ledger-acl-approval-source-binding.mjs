import assert from "node:assert/strict";
import { assertLiveLedgerAclEvidenceMatchesSource } from "./lib/live-ledger-acl-approval-guard.mjs";

const approvedSourceSha = "a".repeat(40);
const otherSha = "b".repeat(40);
const validApproval = {
  qa_tested_commit_sha: approvedSourceSha,
  independent_technical_review: {
    status: "PASS",
    reviewed_commit_sha: approvedSourceSha,
  },
};

assert.equal(assertLiveLedgerAclEvidenceMatchesSource(validApproval, approvedSourceSha), true,
  "Exact QA and independent-review evidence should be accepted.");

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    qa_tested_commit_sha: otherSha,
  }, approvedSourceSha),
  /QA evidence must cover the exact owner-approved source SHA/,
  "A passing APP-01..APP-15 result from a different commit must be rejected.",
);

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    independent_technical_review: {
      ...validApproval.independent_technical_review,
      reviewed_commit_sha: otherSha,
    },
  }, approvedSourceSha),
  /independent technical review must cover the exact owner-approved source SHA/,
  "An independent review of a different commit must be rejected.",
);

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    qa_tested_commit_sha: undefined,
  }, approvedSourceSha),
  /QA evidence must cover the exact owner-approved source SHA/,
  "Missing QA source evidence must fail closed.",
);

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    independent_technical_review: { status: "PASS", reviewer: "reviewer" },
  }, approvedSourceSha),
  /independent technical review must cover the exact owner-approved source SHA/,
  "Missing independent-review source evidence must fail closed.",
);

console.log(JSON.stringify({
  status: "PASS",
  exact_qa_source_binding: "PASS",
  exact_independent_review_source_binding: "PASS",
  mismatched_or_missing_evidence: "REJECTED",
}, null, 2));
