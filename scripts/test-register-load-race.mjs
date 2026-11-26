import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyIfCurrentRequest } from "../src/lib/registerLoadRequest.mjs";

const source=await readFile("src/RegisterPage.tsx","utf8");
assert.ok(source.includes('import { applyIfCurrentRequest } from "./lib/registerLoadRequest.mjs";'),"register uses the tested current-request guard");
assert.ok(source.includes("async function resolve():Promise<string|null>"),"condominium resolution returns an ID without mutating React state");
const resolveBody=source.slice(source.indexOf("async function resolve()"),source.indexOf("const loadRequestRef"));
assert.ok(!resolveBody.includes("setDbId("),"resolve never mutates condominium state");
assert.ok(source.includes("const resolvedDbId=await resolve();if(!applyIfCurrentRequest(requestId,loadRequestRef.current,()=>setDbId(resolvedDbId)))return;"),"only the current request may apply the resolved condominium ID");
assert.ok(source.includes("if(requestId!==loadRequestRef.current)return;"),"stale register response cannot replace current data");
assert.ok(source.includes("if(requestId===loadRequestRef.current)setError("),"stale register load cannot overwrite current error");
assert.ok(source.includes("if(requestId===loadRequestRef.current)setLoading(false);"),"stale register load cannot change loading state");
assert.ok(source.includes("return()=>{loadRequestRef.current+=1;}"),"effect cleanup invalidates outstanding loads");

let currentRequestId=1;
let dbId=null;
let resolveOld, resolveNew;
const oldResolution=new Promise(resolve=>{resolveOld=resolve;});
const newResolution=new Promise(resolve=>{resolveNew=resolve;});
const applyResolution=async(requestId,promise)=> {
  const resolvedId=await promise;
  applyIfCurrentRequest(requestId,currentRequestId,()=>{dbId=resolvedId;});
};
const oldLoad=applyResolution(1,oldResolution);
currentRequestId=2;
const newLoad=applyResolution(2,newResolution);
resolveNew("condominium-current");
await newLoad;
assert.equal(dbId,"condominium-current","newer request applies its condominium ID");
resolveOld("condominium-stale");
await oldLoad;
assert.equal(dbId,"condominium-current","late stale response cannot overwrite the current condominium ID");
console.log("Register page load-race async regression: PASS");
