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
    reviewer: "ChatGPT (same implementation agent; not independent)",
    evidence_reference: "manifest#review_disposition.internal_review",
    reviewed_commit_sha: approvedSourceSha,
  },
};

assert.equal(assertLiveLedgerAclEvidenceMatchesSource(validApproval, approvedSourceSha), true,
  "Exact QA and disclosed internal-review evidence should be accepted.");

assert.throws(() => assertLiveLedgerAclEvidenceMatchesSource({
  ...validApproval, qa_tested_commit_sha: otherSha,
}, approvedSourceSha), /QA evidence must cover the exact owner-approved source SHA/,
"A passing QA result from a different commit must be rejected.");

assert.throws(() => assertLiveLedgerAclEvidenceMatchesSource({
  ...validApproval,
  technical_review: { ...validApproval.technical_review, reviewed_commit_sha: otherSha },
}, approvedSourceSha), /internal technical review must cover the exact owner-approved source SHA/,
"An internal review of a different commit must be rejected.");

assert.throws(() => assertLiveLedgerAclEvidenceMatchesSource({
  ...validApproval,
  technical_review: { ...validApproval.technical_review, conflict_disclosed: false },
}, approvedSourceSha), /non-independence limitation must be explicitly disclosed/,
"An undisclosed conflict must be rejected.");

assert.throws(() => assertLiveLedgerAclEvidenceMatchesSource({
  ...validApproval,
  technical_review: { ...validApproval.technical_review, independent: true },
}, approvedSourceSha), /must not be represented as independent/,
"Internal review must never be represented as independent.");

assert.throws(() => assertLiveLedgerAclEvidenceMatchesSource({
  ...validApproval,
  technical_review: { ...validApproval.technical_review, evidence_reference: undefined },
}, approvedSourceSha), /must identify its author and evidence/,
"Missing internal-review evidence must be rejected.");

console.log(JSON.stringify({
  status: "PASS",
  exact_qa_source_binding: "PASS",
  exact_internal_review_source_binding: "PASS",
  conflict_disclosure_required: "PASS",
  false_independence_claim_rejected: "PASS",
  mismatched_or_missing_evidence: "REJECTED",
}, null, 2));
