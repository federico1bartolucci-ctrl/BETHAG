import { readdir } from "node:fs/promises";
import { validateMigrationNames } from "./migration-name-validation.mjs";

const directory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const errors = validateMigrationNames(files);

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Controllate ${files.length} migrazioni SQL: nomi validi e timestamp univoci.`);
}
