# Audit — reject incomplete outgoing-member arrays during transfer confirmation

**Date:** 25 November 2026

## Finding

`private.confirm_condominium_member_transfer` validated existing rows found by `id = ANY(v_outgoing_ids)`, but did not prove that every JSON array element resolved to an eligible current owner on the selected unit.

A missing UUID or JSON `null` produced no matching member row and therefore bypassed the `EXISTS` predicate. The RPC could mark the valid outgoing owner `In chiusura`, create the incoming owner and persist a transfer containing an invalid outgoing-member list. The later authoritative closure guard in PR #453 correctly rejects that malformed list, leaving the confirmed transfer unable to close without manual data repair.

Open PRs #6 and #10 are stale October integration drafts. They do not implement the current multi-member `outgoing_member_ids` array validation and do not cover missing/NULL elements.

## Correction

The new forward-only candidate migration `20261125080000_validate_member_transfer_outgoing_ids_on_confirmation.sql`:

- uses `array_position` to include the primary outgoing member without SQL three-valued-logic ambiguity;
- locks eligible existing co-owners for the selected unit;
- validates every array element with `unnest` and a correlated membership lookup;
- rejects NULL, missing, inactive, non-owner, other-unit or other-condominium IDs before any member, portal, incoming-member or transfer write;
- scopes the final outgoing member reads/updates and portal-access deactivation by the selected workspace/condominium/unit.

The existing closure guard remains in place as a second authoritative check.

## Regression coverage

New `scripts/test-member-transfer-confirm-outgoing-member-ids.mjs`, wired into `npm test`, uses isolated PGlite:

- reproduces the old function accepting missing and NULL IDs and creating confirmed transfer records;
- verifies the corrected function rejects both before changing the outgoing owner, inserting an incoming member or creating a transfer;
- verifies valid co-owner arrays still succeed;
- verifies an empty array still falls back to the primary outgoing member.

No remote database is used.

## Dependency and safety

Stacked on PR #453, which validates the same IDs again at closure. SQL remains under `supabase/rebuild/proposed-forward-migrations`, outside live `supabase/migrations`. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
