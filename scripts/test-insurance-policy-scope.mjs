import {readFileSync} from "node:fs";import assert from "node:assert/strict";
const s=readFileSync(new URL("../src/InsurancePoliciesSection.tsx",import.meta.url),"utf8");
const save=s.slice(s.indexOf("const save = async"),s.indexOf("const remove = async"));
const remove=s.slice(s.indexOf("const remove = async"),s.indexOf("const summary = useMemo"));
assert.match(save,/\.update\(payload\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", dbCondominiumId\)/);
assert.match(remove,/\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", dbCondominiumId\)/);
console.log("Insurance policy scope regression checks passed.");