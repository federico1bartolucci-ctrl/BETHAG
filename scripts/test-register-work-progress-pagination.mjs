import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile("src/RegisterPage.tsx","utf8");
const packageJson=JSON.parse(await readFile("package.json","utf8"));
assert.match(source,/const loadProgressRows=async\(\)=>\{const rows:any\[\]=\[\];for\(let offset=0;;offset\+=1000\)/);
assert.match(source,/\.from\("condominium_work_progress"\)[\s\S]*?\.range\(offset,offset\+999\)/);
assert.match(packageJson.scripts.test,/test-register-work-progress-pagination\.mjs/);
console.log("Register work-progress pagination regression checks passed.");
