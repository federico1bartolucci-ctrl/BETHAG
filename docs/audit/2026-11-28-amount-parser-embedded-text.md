# Audit — reject embedded text in shared amount parsing

Date: 2026-11-28

## Finding

The shared `parseBethagAmount()` parser removed every character outside digits, separators and signs before validating the value. This silently converted corrupted OCR/CSV strings such as `12abc34` into `1234`, `1e3` into `13`, and `1,234.50USD` into `1,234.50`.

The invoice-specific parser already rejects embedded letters and currency markers, so the shared parser had a weaker and inconsistent input contract.

## Correction

- Reject alphabetic text and unsupported characters instead of silently deleting them.
- Permit only the supported currency symbols (€/$/£/¥) or EUR marker once, at the beginning or end of the amount.
- Preserve Italian/US decimal and thousands parsing, valid repeated grouping, accounting parentheses, Unicode minus, fallback behavior and previously supported whitespace normalization.
- Reject duplicated leading and trailing currency markers.

## Runtime regression

Extended `scripts/test-consumption-csv-parser.mjs`, already registered exactly once in `npm test`.

Coverage includes malformed OCR strings, embedded/unsupported currency text, supported leading/trailing currency markers, CSV all-or-nothing rejection and valid currency-formatted CSV values.

## Safety

No schema or migration changes. No QA/Production access or writes. No Storage/R2 operations. No merge, deploy, reset or manual workflow dispatch.
