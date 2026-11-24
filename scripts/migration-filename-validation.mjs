const VERSION_PATTERN = /^[0-9]{14}$/;

export function isValidMigrationTimestamp(version) {
  if (!VERSION_PATTERN.test(version)) return false;

  const year = Number(version.slice(0, 4));
  const month = Number(version.slice(4, 6));
  const day = Number(version.slice(6, 8));
  const hour = Number(version.slice(8, 10));
  const minute = Number(version.slice(10, 12));
  const second = Number(version.slice(12, 14));

  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysByMonth[month - 1];
}

export function validateMigrationFilenames(files) {
  const versions = new Map();
  const invalid = [];

  for (const filename of files) {
    const separator = filename.indexOf("_");
    const version = separator === -1 ? "" : filename.slice(0, separator);
    const suffix = separator === -1 ? "" : filename.slice(separator + 1);

    if (
      !VERSION_PATTERN.test(version)
      || !suffix.endsWith(".sql")
      || suffix.length <= 4
      || !isValidMigrationTimestamp(version)
    ) {
      invalid.push(filename);
      continue;
    }

    versions.set(version, [...(versions.get(version) ?? []), filename]);
  }

  const duplicates = [...versions.entries()].filter(([, names]) => names.length > 1);
  return { invalid, duplicates };
}
