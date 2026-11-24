# Audit — member-transfer close UI condominium scope

Date: 2026-11-24

## Finding

After `closeCondominiumMemberTransferBackend` successfully closes the accounting transfer, the main-shell UI archives the outgoing member by comparing only the legacy numeric `member.id`.

The frontend collection contains members from multiple condominiums in the active workspace. Legacy member IDs are not globally unique across condominiums. If two condominiums contain the same numeric ID, closing one transfer can mark both members inactive and overwrite both records' `position_status` and `current_owner` fields in local UI state.

The authoritative backend close operation is keyed by transfer ID; the defect is in the subsequent client-side state projection.

## Correction

- Introduce `archiveTransferredMember`, which requires both member ID and condominium ID.
- Fail closed when either scope key is absent or invalid.
- Preserve all unrelated member objects and existing `data` fields.
- Use the current transfer member's `condominiumId` when updating UI state.

## Regression

`scripts/test-member-transfer-close-scope.mjs` reproduces the legacy ID-only collision with two members sharing ID 51 in different condominiums. It verifies that only the member in the closed transfer's condominium is archived, and that missing/invalid scope does not mutate the collection.

The regression is wired into `npm test`.

## Safety and verification status

This change is isolated on `audit-member-transfer-close-ui-scope-20261124`, based on CAP candidate `2261de7bcd5d81cbf79d506e77747bda318f89f1`. No QA or Production data has been read or modified. No merge or deployment is performed.

Exact-head CI remains the closure gate. Real authenticated QA tests are not implied by local/unit regression coverage.
