export function validateMigrationNames(files) {
  const errors = [];
  const seenVersions = new Map();

  for (const name of files) {
    const match = /^(\d{14})_([a-z0-9][a-z0-9_-]*)\.sql$/.exec(name);
    if (!match) {
      errors.push(`Nome migrazione non valido: ${name} (atteso YYYYMMDDHHMMSS_descrizione.sql)`);
      continue;
    }

    const [, version] = match;
    const previous = seenVersions.get(version);
    if (previous) {
      errors.push(`Timestamp duplicato ${version}: ${previous} e ${name}`);
    } else {
      seenVersions.set(version, name);
    }
  }

  if (files.length === 0) {
    errors.push("Nessuna migrazione SQL trovata in supabase/migrations");
  }

  return errors;
}
