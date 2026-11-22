import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("resident request form clears only after awaited persistence succeeds", async () => {
  const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  assert.match(source, /onCreateRequest:\s*\(request: CondominiumRequest\) => Promise<void>/);
  assert.match(source, /const submitRequest = async \(\) => \{/);
  assert.match(source, /await onCreateRequest\(/);
  assert.match(source, /catch \{\s*\/\/ Conserva i campi compilati/);
  assert.match(source, /disabled=\{requestSubmitting\}/);
  assert.match(source, /throw requestError;/);
  const submitStart = source.indexOf("const submitRequest = async");
  const submitEnd = source.indexOf("\n  return (", submitStart);
  assert.ok(submitStart >= 0 && submitEnd > submitStart);
  const submitBlock = source.slice(submitStart, submitEnd);
  assert.ok(submitBlock.indexOf("await onCreateRequest") < submitBlock.indexOf('setRequestDescription("")'));
  assert.ok(submitBlock.indexOf('setRequestDescription("")') > submitBlock.indexOf("try {"));
});
