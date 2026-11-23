# Audit: strict invoice date validation (2026-11-23)

## Finding
Invoice confirmation previously substituted today's date when the extracted invoice date was missing. This made the subsequent missing-date guard ineffective. The parser also accepted impossible calendar dates in Italian format and could throw for unparseable values through `toISOString()`.

## Correction
- Missing or unsupported invoice date values now return an empty value and are rejected by `confirmCondominiumInvoice` before accounting writes.
- Accepted formats are Italian `DD/MM/YYYY` or `DD-MM-YYYY`, and ISO `YYYY-MM-DD`.
- Calendar validity is checked (e.g. 31/02 is rejected).

## Regression coverage
- Missing/null/blank dates remain missing.
- Italian and ISO date formats normalize.
- Impossible dates and unsupported strings are rejected.
- The new regression is wired into `npm test`.

## Verification status
Code and regression test were committed on an isolated draft branch. Local test/build execution was unavailable through the current runtime. CI must pass on the exact PR head before closure.

## Safety
Draft only. No merge, deployment, QA or Production data modification, reset, or workflow dispatch.
