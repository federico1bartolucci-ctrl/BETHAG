# Audit — refresh local date in member-transfer form

**Date:** 26 November 2026

## Reproducible finding

The member-transfer form initialized its transfer date only when mounted. If it remained open across local midnight, the date could be stale when preparing the accounting preview or confirming the transfer.

## Correction

- Use local year/month/day fields instead of UTC conversion.
- Refresh the untouched default on date-field focus, unit/member changes, preview, and both confirmation stages.
- Preserve dates explicitly selected by the administrator.
- Invalidate stale accounting previews and require the preview date to match the date sent to the confirmation RPC.
- Reset the next form to the current local date after a successful transfer.

## Regression coverage

`scripts/test-member-transfer-date-refresh.mjs` covers Europe/Rome midnight and daylight-saving transitions, explicit date preservation, refresh wiring, stale-preview rejection, RPC date consistency, and npm test inclusion.

## Scope and safety

This is a frontend correction only. It is ported directly onto current `main` without importing unrelated commits from the older stacked transfer PR chain. No database schema, migration, QA, Production, Supabase configuration, or stored data is changed.
