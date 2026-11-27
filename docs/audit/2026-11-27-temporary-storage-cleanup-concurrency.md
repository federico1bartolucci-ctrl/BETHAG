# Bound temporary Storage cleanup concurrency

Date: 2026-11-27

## Finding

The temporary AI-document cleanup helper started one Supabase Storage removal request per unique file using an unbounded `Promise.all`. A large document batch could therefore issue dozens or hundreds of simultaneous requests. If Storage returned HTTP 429 while overloaded, the helper retried the entire failed set concurrently once, reproducing the same overload and leaving private temporary files behind.

The previous regression covered a single-file 429 retry but did not exercise concurrent rate limiting across a multi-file batch.

## Correction

- Replace unbounded per-file fan-out with a bounded worker pool.
- Limit concurrent Storage removals to five by default.
- Preserve de-duplication, input order in the result list, retry classification and per-path warnings.
- Validate retry and concurrency limits as positive integers; reject invalid settings before issuing Storage requests.

## Runtime regression

`scripts/test-temporary-storage-cleanup-concurrency.mjs` reproduces a Storage endpoint that returns HTTP 429 whenever more than five removals are active. The old implementation starts all 23 requests concurrently and exhausts its retry while still over the limit. The bounded worker pool completes all 23 removals with a maximum of five concurrent requests. The test is registered in `npm test`.

## Safety

This follow-up is stacked on draft PR #196 because it hardens the temporary Storage cleanup introduced there. It uses mocked Storage responses only. No QA/Production database or Storage objects are accessed or modified. No migration, merge, deployment, reset or manual workflow dispatch.
