import { readdir } from "node:fs/promises";
const directory = "supabase/migrations";
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
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
  errors.push(`Nessuna migrazione SQL trovata in ${directory}`);
}

if (errors.length > 0) {
  console.error("Controllo migrazioni fallito:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Controllo migrazioni superato: ${files.length} file SQL, timestamp univoci e nomi validi.`);
}
