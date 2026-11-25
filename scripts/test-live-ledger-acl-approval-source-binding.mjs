import assert from "node:assert/strict";
import { assertLiveLedgerAclEvidenceMatchesSource } from "./lib/live-ledger-acl-approval-guard.mjs";

const approvedSourceSha = "a".repeat(40);
const otherSha = "b".repeat(40);
const validApproval = {
  qa_tested_commit_sha: approvedSourceSha,
  technical_review: {
    review_type: "INTERNAL_SELF_REVIEW",
    status: "PASS_WITH_DISCLOSED_CONFLICT",
    independent: false,
    conflict_disclosed: true,
    reviewed_commit_sha: approvedSourceSha,
  },
};

assert.equal(assertLiveLedgerAclEvidenceMatchesSource(validApproval, approvedSourceSha), true,
  "Exact QA and disclosed internal-review evidence should be accepted.");

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
    technical_review: { ...validApproval.technical_review, reviewed_commit_sha: otherSha },
  }, approvedSourceSha),
  /internal technical review must cover the exact owner-approved source SHA/,
  "An internal review of a different commit must be rejected.",
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
    technical_review: { ...validApproval.technical_review, reviewed_commit_sha: undefined },
  }, approvedSourceSha),
  /internal technical review must cover the exact owner-approved source SHA/,
  "Missing internal-review source evidence must fail closed.",
);

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    technical_review: { ...validApproval.technical_review, conflict_disclosed: false },
  }, approvedSourceSha),
  /non-independent review limitation must be explicitly disclosed/,
  "A review that hides its non-independence must be rejected.",
);

assert.throws(
  () => assertLiveLedgerAclEvidenceMatchesSource({
    ...validApproval,
    technical_review: { ...validApproval.technical_review, independent: true },
  }, approvedSourceSha),
  /must not be represented as independent/,
  "An internal review must never be promoted to independent review.",
);

console.log(JSON.stringify({
  status: "PASS",
  exact_qa_source_binding: "PASS",
  exact_internal_review_source_binding: "PASS",
  conflict_disclosure_required: "PASS",
  non_independent_review_claim_rejected: "PASS",
  mismatched_or_missing_evidence: "REJECTED",
}, null, 2));
