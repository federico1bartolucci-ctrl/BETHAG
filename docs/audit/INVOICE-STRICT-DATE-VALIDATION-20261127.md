# Strict invoice date validation — 2026-11-27

## Finding

The invoice date parser substituted the current date when the extracted date was missing. This made the confirmation guard ineffective for absent dates. It also accepted impossible calendar dates and could throw while converting unsupported values with toISOString().

## Correction

- Missing, blank and unsupported dates remain empty and are rejected before accounting writes.
- Accept only Italian DD/MM/YYYY or DD-MM-YYYY and ISO YYYY-MM-DD formats.
- Validate the actual calendar date, including leap years and month/day ranges.
- Avoid Date.UTC's special handling of years 0001–0099 and reject year 0000.

## Regression coverage

- Missing/null/blank dates remain missing.
- Italian and ISO formats normalize to YYYY-MM-DD.
- Valid leap days pass; impossible dates, unsupported formats and out-of-range years fail closed.
- Verify the invoice confirmation path uses the strict parser and rejects an empty result.

## Safety

Application parser, test and documentation changes only. No database writes, migrations, QA/Production access, Supabase deployment, reset or paid service activation.
