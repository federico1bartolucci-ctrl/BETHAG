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

let applied=[];
assert.equal(applyIfCurrentRequest(1,2,()=>applied.push("stale")),false,"older request is rejected after newer request starts");
assert.deepEqual(applied,[],"stale resolution cannot change condominium scope");
assert.equal(applyIfCurrentRequest(2,2,()=>applied.push("current")),true,"current request is accepted");
assert.deepEqual(applied,["current"],"only the current resolution updates condominium scope");
console.log("Register page load-race runtime regression: PASS");
