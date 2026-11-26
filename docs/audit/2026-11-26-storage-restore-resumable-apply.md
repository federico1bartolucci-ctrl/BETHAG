# Audit — resumable R2 Storage restore after partial writes

**Date:** 26 November 2026  
**Scope:** isolated repository branch stacked on the R2 folder-marker target-preflight PR #505.

## Finding and reproduction

The guarded restore verified all source blobs and then uploaded target objects sequentially. If a later PutObject failed after one or more successful writes, the command exited with an error but left the already-written objects in the recovery bucket.

The next attempt used an empty-only target preflight. It therefore rejected the partial target as non-empty, even when every existing object had been written by the immediately preceding attempt from the exact same manifest and its bytes were correct. The operator could not safely resume with the utility; the only documented path was manual intervention or a new empty recovery bucket.

The runtime regression reproduces this deterministically: three manifest objects, a simulated failure on the second PUT, one successfully written object, rejection by the old empty-only preflight, then successful continuation by the new same-manifest verification path.

## Correction

- List the recovery target with complete S3 pagination, stable key validation, duplicate detection, page-count bounds, and fail-closed handling for missing/repeated continuation tokens or inconsistent page metadata.
- Treat every target key, including folder markers, as an object. Any key absent from the selected manifest is rejected.
- Read and SHA-256/size-verify every pre-existing target object before treating it as a resumable object.
- Skip only exact matching objects; write only missing keys.
- Read every newly written object back and verify its byte length and SHA-256.
- Verify the final paginated target key set exactly matches the selected manifest.
- Never delete or overwrite target objects.
- Require the operator to rerun the exact same manifest against the same recovery target after an interrupted apply. Concurrent restores to one target are not supported and must not be run.

## Regression coverage

Added scripts/test-storage-restore-resume.mjs to npm test.

It covers:
- multi-page target inventory and continuation-token propagation;
- truncated page without a token;
- repeated continuation token;
- duplicate keys across pages;
- inconsistent KeyCount;
- partial failure after the first successful PUT;
- reproduction of the old empty-only retry rejection;
- resumption by skipping the byte-verified existing object;
- unexpected keys and folder markers;
- same-key objects with mismatched bytes;
- corrupt read-after-write response;
- exact final target key inventory.

## Safety

- No Supabase QA or Production access or writes.
- No Cloudflare R2 API calls or object writes.
- No workflow dispatch or workflow-file changes.
- No database migration changes.
- No merge or deployment.
- PR is stacked on #505 to preserve the folder-marker correction without duplicating it.
- A real non-empty isolated restore drill remains pending; CI uses deterministic fake S3 clients only.
