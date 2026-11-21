import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("scripts/list-supabase-backups.mjs", "utf8");
assert.match(source, /Provider error bodies may contain account or operational metadata; do not print them/);
assert.doesNotMatch(source, /console\.error\(body\.slice/);
assert.doesNotMatch(source, /raw:\s*payload/);
assert.match(source, /responseShape\s*=\s*payload && typeof payload === "object" \? Object\.keys\(payload\) : \[\]/);
assert.match(source, /process\.exit\(1\)/, "Unexpected response shapes must fail instead of being reported as successful inventory.");
assert.match(source, /backups\.map\(\(item\) => \(\{/);
console.log(JSON.stringify({ backup_inventory_response_redaction: "PASS", provider_error_body_exposure: false, unexpected_payload_dump: false }, null, 2));
