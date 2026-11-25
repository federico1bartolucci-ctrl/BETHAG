import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.match(source, /previewRequestId\s*=\s*useRef\(0\)/, "Preview requests must have a monotonic identity.");
assert.match(source, /const requestId = \+\+previewRequestId\.current/, "Each preview request must invalidate older requests.");
assert.match(source, /if \(requestId !== previewRequestId\.current\) return;/, "Stale preview responses must not overwrite newer state.");
assert.match(source, /if \(requestId === previewRequestId\.current\) \{\s*setPreview\(null\);\s*setError\(/, "Only the current request may set preview errors.");
assert.match(source, /finally \{ if \(requestId === previewRequestId\.current\) setBusy\(false\); \}/, "Stale requests must not clear the current loading state.");
console.log("Member transfer preview race guards: PASS");
