import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
assert.match(source, /rows\.sort\(\(a,b\) => b\.remainder-a\.remainder \|\| \(String\(a\.unit\.id\)\.toLowerCase\(\) < String\(b\.unit\.id\)\.toLowerCase\(\) \? -1 : String\(a\.unit\.id\)\.toLowerCase\(\) > String\(b\.unit\.id\)\.toLowerCase\(\) \? 1 : 0\)\)/);

const tied = [
  { id: "f0000000-0000-0000-0000-000000000000", remainder: 0.5 },
  { id: "10000000-0000-0000-0000-000000000000", remainder: 0.5 },
];
tied.sort((a,b) => b.remainder-a.remainder || (String(a.id).toLowerCase() < String(b.id).toLowerCase() ? -1 : String(a.id).toLowerCase() > String(b.id).toLowerCase() ? 1 : 0));
assert.equal(tied[0].id, "10000000-0000-0000-0000-000000000000", "equal remainders must use ascending UUID order, matching SQL");
console.log("Accounting allocation tie-break guard: PASS");
