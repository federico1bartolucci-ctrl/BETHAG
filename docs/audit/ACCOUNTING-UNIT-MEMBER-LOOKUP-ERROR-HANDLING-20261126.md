# Unified-installment member lookup failure handling — 2026-11-26

## Finding

The unified-installment flow awaited the member query and threw returned Supabase errors, but it did not guard rejected query promises or successful responses with malformed data. A null/non-array response could be treated as an empty owner list, while null rows or malformed metadata could crash or mis-group unit owners. This made the operation fail unpredictably instead of presenting a controlled error before generating installments.

## Correction

- Wrap the query execution in a result-normalizing helper.
- Convert returned backend errors and rejected promises into a stable UI error result.
- Reject non-array data, null rows, missing unit IDs and malformed metadata before consuming any row.
- Keep the existing workspace, condominium, active-member and selected-unit filters.
- Stop installment generation and show the error when the lookup is not valid.

## Regression coverage

- Successful query result.
- Supabase returned error and rejected query promise.
- Null/non-array response, null rows, missing unit IDs and malformed metadata.
- UI wiring retains all workspace/condominium/active/unit filters and returns before processing invalid results.

## Safety

Application/helper/test/documentation changes only. No database writes, migrations, QA/Production access, Supabase deployment, reset or paid service activation.
