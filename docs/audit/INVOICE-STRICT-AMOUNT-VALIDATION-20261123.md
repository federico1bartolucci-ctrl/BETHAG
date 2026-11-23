# Audit: strict invoice amount parsing (2026-11-23)

## Finding
The invoice amount parser removed all non-numeric characters before parsing. Malformed OCR strings could therefore become valid-looking amounts (for example, `12abc34` becoming `1234`).

## Correction
- Accept finite numeric values and strict numeric strings.
- Support Italian grouping/decimal format (1.234,56), US grouping/decimal format (1,234.56), decimal comma/dot, integers, and common currency symbols.
- Reject malformed punctuation, embedded letters, and excess decimal digits rather than silently stripping them.
- Invalid values return zero; invoice confirmation already blocks amounts that are not positive.

## Regression
Added isolated parser tests covering valid locale formats, malformed OCR, empty values, and non-finite numbers.

## Safety
Draft only. No QA/Production data changes, merge, deployment, reset, or manually dispatched workflow.
