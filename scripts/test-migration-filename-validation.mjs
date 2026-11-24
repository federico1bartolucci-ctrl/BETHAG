import assert from "node:assert/strict";
import {
  isValidMigrationTimestamp,
  validateMigrationFilenames,
} from "./migration-filename-validation.mjs";

const validFilenames = [
  "20240229000000_leap_day.sql",
  "20261124000000_first_second.sql",
  "20261124235959_last_second.sql",
  "20000229010203_century_leap_year.sql",
];
assert.deepEqual(validateMigrationFilenames(validFilenames), { invalid: [], duplicates: [] });

const invalidFilenames = [
  "20261124240000_hour_24.sql",
  "20261124250000_hour_25.sql",
  "20261124236000_minute_60.sql",
  "20261124235960_second_60.sql",
  "20261301000000_month_13.sql",
  "20261131000000_day_31_in_november.sql",
  "20250229000000_non_leap_february_29.sql",
  "20260431000000_april_31.sql",
  "00000101000000_year_zero.sql",
  "20261124_missing_time.sql",
  "20261124000000_missing_extension.txt",
];
assert.deepEqual(validateMigrationFilenames(invalidFilenames).invalid, invalidFilenames);
assert.equal(isValidMigrationTimestamp("20261124240000"), false);

const duplicateFiles = ["20261124235959_first.sql", "20261124235959_second.sql"];
assert.deepEqual(validateMigrationFilenames(duplicateFiles).duplicates, [
  ["20261124235959", duplicateFiles],
]);

console.log("Migration filename calendar-validation runtime regression: PASS");
