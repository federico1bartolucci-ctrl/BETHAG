# QA migration replay request — 2026-11-04

This marker exists only to trigger the isolated `qa-ledger-replay-reconstruction` GitHub Actions workflow against the exact 34-row live QA migration ledger snapshot (`supabase/rebuild/qa-ledger-20261104.json`).

The workflow targets a disposable PostgreSQL 17 service in GitHub Actions. It must not connect to Production or the live QA branch.
