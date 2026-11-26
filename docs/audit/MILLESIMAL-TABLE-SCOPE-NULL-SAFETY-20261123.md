# Millesimal Table Scope Null Safety — 2026-11-23

## Finding
Accounting table completeness checks called `includes()` and `some()` directly on `scope_unit_ids` and `scope_building_codes`. Older or malformed persisted rows with null/missing arrays could crash the accounting render.

## Correction
- Extracted table-scope matching into a defensive helper.
- Missing `scope_mode` defaults to all units for legacy compatibility.
- Missing/null scope arrays are treated as empty arrays for scoped modes.
- Building-code matching remains trimmed and case-insensitive, and empty unit codes do not match.

## Regression
Added cases for missing/null arrays, all/units/buildings modes, alternate unit metadata, normalization and unknown modes. Test is wired to `npm test`.

## Verification
Source/helper/test/package/docs changes are statically checked after re-fetch. Runtime test/build/CI required for closure. Draft only; no merge, deploy, QA or Production changes.
