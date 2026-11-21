import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile("src/main.tsx","utf8");
assert.ok(source.includes("const backendRefreshRequestRef = useRef(0);"),"workspace refreshes share a generation counter");
assert.ok(source.includes("const requestId = ++backendRefreshRequestRef.current;"),"each refresh gets a request generation");
assert.ok(source.includes("cancelled || requestId !== backendRefreshRequestRef.current"),"obsolete refresh results are discarded");
assert.ok(source.includes("backendRefreshRequestRef.current += 1;"),"effect cleanup invalidates outstanding refreshes");
assert.ok(source.includes("requestId === backendRefreshRequestRef.current) console.error"),"stale refresh failures are ignored");
console.log("Workspace refresh race regression checks passed");
