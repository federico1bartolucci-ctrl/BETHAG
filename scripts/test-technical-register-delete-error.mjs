import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../src/RegisterPage.tsx",import.meta.url),"utf8");
const start=source.indexOf("async function remove(table:string,id:string,label:string)");
const end=source.indexOf(" return <section",start);
assert.ok(start>=0&&end>start,"technical register remove handler must exist");
const handler=source.slice(start,end);
assert.ok(handler.includes("if(error){setError(error.message||\"Impossibile cancellare il record.\");return;}"),"delete failures must expose the Supabase error instead of a generic label");
console.log("Technical register delete error regression checks passed.");
