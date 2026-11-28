# R2 resumable restore: verify object metadata before skipping existing objects

Date: 2026-11-28

## Finding

The resumable restore path verified existing target objects by key, byte length and SHA-256 only. It then added the key to `existingKeys`; `restoreMissingObjects()` skipped that object without comparing its HTTP content headers or user metadata with the selected snapshot manifest.

The manifest records `content_type`, `cache_control`, `content_disposition`, `content_encoding`, `content_language`, `expires` and `metadata`. New objects are written with those values. Existing objects accepted during resume were not checked for them.

## Reproduction

A target object with the expected key, exact bytes, size and SHA-256, but with `Content-Type: application/pdf` instead of the manifest's `text/plain`, passed the previous preflight. The restore then counted it as resumed and skipped the write. The same gap applied to Cache-Control, Content-Disposition, Content-Encoding, Content-Language, Expires and user metadata.

This can leave a restore reporting complete while browser-visible content handling or application metadata differs from the source snapshot.

## Correction

- Normalize and compare all manifest-preserved object metadata against the target `GetObject` response before adding an existing key to the resumable set.
- Compare user-metadata keys case-insensitively, matching S3 metadata behavior, while preserving exact values.
- Normalize `Expires` to a timestamp before comparison.
- Apply the same metadata check to newly written objects during read-after-write verification.
- Fail closed on mismatches. Do not overwrite or delete existing target objects.
- Preserve the existing byte-integrity, target-inventory and same-manifest resume checks.

## Runtime regression

Extended the existing `scripts/test-storage-restore-resume.mjs`, already included exactly once in `npm test`.

Coverage includes:
- exact bytes with wrong Content-Type are rejected;
- exact bytes with wrong user metadata are rejected;
- case-only differences in user-metadata keys are accepted;
- a new PUT with correct bytes but wrong Content-Type fails read-after-write verification;
- the existing interrupted-write/resume, pagination, unexpected-key, folder-marker, corrupt-byte and final-inventory regressions remain.

## Scope and safety

- Branch is based on current main `fb2ecfc3d402be2ccc57e3955651223eed213040`.
- No SQL or migration changes.
- No Supabase QA/Production access or writes.
- No Cloudflare R2 API calls or object writes.
- No merge, deploy, reset or manual workflow dispatch.
- A real non-empty isolated restore drill remains required; deterministic fake S3 tests do not prove recovery of an actual bucket.
