# Audit: malformed Accounting member pagination response — 2026-11-24

## Finding
The cumulative Accounting member loader used `data ?? []`. A successful response with `data:null` and no error was silently treated as an empty member list, hiding all members from accounting hydration. A non-array object caused an opaque spread TypeError. The loader also accepted oversized pages and duplicate IDs without validation.

## Reproduction
Local runtime harness against the previous helper:
- `data:null,error:null` returned `{data:[],error:null}` instead of rejecting.
- `data:{id:"not-an-array"},error:null` threw an unhandled TypeError from spread.

## Correction
- Require every successful page to be an array.
- Reject pages larger than the 1000-row page size.
- Reject missing or duplicate member IDs.
- Verify the returned condominium relation's workspace ID matches the active workspace.
- Abort hydration on malformed page rather than accepting incomplete accounting data.

## Runtime regression
Added malformed-response cases (null, object, oversized, duplicate IDs, foreign workspace) to the existing consolidated pagination test, which is already included in `npm test`.

## Local verification
The targeted Node runtime regression passed. Full repository `npm test` and build require CI on the new exact SHA.

## Safety
Updated existing draft PR #387 only; no duplicate PR created. No QA/Production changes, merge, deploy, reset, or manual workflow dispatch.
