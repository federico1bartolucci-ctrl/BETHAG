import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("workspace condominium requests are loaded with pagination", async () => {
  const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
  assert.match(source, /const loadWorkspaceRows = async \([\s\S]*?\.range\(offset, offset \+ 999\)/);
  assert.match(source, /loadWorkspaceRows\("condominium_requests"\)/);
  assert.doesNotMatch(source, /supabase\.from\("condominium_requests"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)/);
});
