# Audit — empty outgoing-member array must not bypass transfer closure

**Date:** 25 November 2026

## Finding

The transfer closure check and authoritative close helper derive `v_outgoing_ids` from `data->'outgoing_member_ids'` when that JSON field is an array. The code used `array_agg(...)` directly. For an empty JSON array, `array_agg` returns SQL NULL; predicates such as `member_id = ANY(v_outgoing_ids)` then match no member-linked rows.

A transfer with an empty `outgoing_member_ids` array could therefore report zero member-linked installments, allocations and carryovers and proceed toward closure while the primary `outgoing_member_id` still has open balances.

This is not covered by open PR #438 (preview unit scope) or #440 (closure unit scope): both scope financial rows to a selected unit but retain the empty-array aggregation behavior. No open PR was found for the empty-array fallback.

## Correction

In both `private.check_condominium_member_transfer_closure` and `private.close_condominium_member_transfer`, coalesce the aggregated array with `ARRAY[t.outgoing_member_id]`. An empty array now falls back to the primary outgoing member ID; non-empty multi-member arrays remain unchanged.

The correction is added to the existing forward-only proposed migration for #440. It remains outside canonical `supabase/migrations` and is not applied to any environment.

## Regression coverage

Extend `scripts/test-member-transfer-closure-unit-scope.mjs` with a transfer whose `outgoing_member_ids` is `[]`:
- baseline reproduction confirms member-linked balances disappear (only the unit-level carryover remains);
- corrected migration restores the primary member's selected-unit and legacy unit-null balances;
- the authoritative close helper rejects the transfer while those balances remain open.

The existing unit-scope and ownership-share compatibility scenarios remain in place.

## Dependency and safety

Stacked on PR #440, which itself depends on #438. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
