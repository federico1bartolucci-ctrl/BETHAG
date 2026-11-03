import { readdir } from "node:fs/promises";
import { validateMigrationNames } from "./migration-name-validation.mjs";

const directory = "supabase/migrations";
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const errors = validateMigrationNames(files);

if (errors.length > 0) {
  console.error("Controllo migrazioni fallito:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Controllo migrazioni superato: ${files.length} file SQL, timestamp univoci e nomi validi.`);
}
