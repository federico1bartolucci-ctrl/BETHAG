import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const paths = [
  "supabase/functions/bethag-ai-condominium/index.ts",
  "supabase/functions/bethag-ai-document/index.ts",
];
for (const path of paths) {
  const source = readFileSync(path, "utf8");
  assert.match(source, /model\s*:\s*"gpt-6-luna"/, path + " must use the verified OpenAI model ID");
  assert.doesNotMatch(source, /gpt-5\.6-luna/, path + " contains an unverified model ID");
  const gate = source.indexOf("BETHAG_AI_ENABLED");
  const storage = source.indexOf(".storage.from(");
  const upload = source.indexOf("https://api.openai.com/v1/files");
  const response = source.indexOf("https://api.openai.com/v1/responses");
  assert.ok(gate >= 0 && storage > gate && upload > gate && response > gate, path + " must gate storage and provider calls");
  assert.match(source, /BETHAG_AI_ENABLED.{0,180}!==\s*"true"/s, path + " must remain disabled unless explicitly enabled");
}
console.log("PASS: both AI functions use the verified model and fail-closed cost gate.");
