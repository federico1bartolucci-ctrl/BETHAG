# GitHub Pages artifact metadata readiness — 2026-11-26

## Finding

After `actions/upload-pages-artifact@v3` reports a successful upload, the immediately following `actions/deploy-pages@v4` step can query the workflow-run artifact API before the artifact metadata is visible. In observed runs, upload completed and the artifact was retrievable shortly afterward, but the immediate deploy lookup returned zero artifacts. A manual job retry then produced duplicate artifacts for the same run, which caused a second failure.

## Correction

- Keep the unique `github-pages-${{ github.run_attempt }}` artifact name introduced by PR #616.
- Insert a bounded readiness poll between upload and deploy.
- Use the workflow token with read-only Actions permission to query the current run's artifact list.
- Require exactly one unexpired artifact matching the current attempt name.
- Retry every five seconds for at most 60 seconds, then fail with an explicit diagnostic.

## Regression

Extend `scripts/test-pages-artifact-run-attempt.mjs` to verify the unique artifact name and the bounded metadata-readiness poll placement.

## Safety

This affects only GitHub Actions deployment orchestration. No Supabase calls, QA/Production data writes, migrations, resets or paid services.
