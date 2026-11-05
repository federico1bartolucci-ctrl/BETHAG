# Final APP collaudo request — 2026-11-05

This marker intentionally enables the sequential APP acceptance suite in the build workflow for the existing QA branch only.

Scope:
- Run the existing QA authenticated/RLS, accounting, transfer, carryover, communication, browser and navigation suites sequentially.
- Use uniquely marked synthetic fixtures and each script's cleanup.
- Do not send real outbound email.
- Do not modify Production.
- Remove this marker after the run so later builds do not repeat the live QA collaudo.
