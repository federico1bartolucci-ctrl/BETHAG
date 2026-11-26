import assert from "node:assert/strict";
import { millesimalTableScopeMatchesUnit } from "../src/lib/millesimalTableScope.mjs";

const unit={id:"unit-1",building_code:"12"};
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"all"},unit),true);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"units",scope_unit_ids:["unit-1"]},unit),true);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"units",scope_unit_ids:null},unit),false);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"units"},unit),false);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"buildings",scope_building_codes:[" 12 "]},unit),true);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"buildings",scope_building_codes:null},unit),false);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"buildings"},unit),false);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"buildings",scope_building_codes:["12"]},{id:"u2",data:{civic_code:"12"}}),true);
assert.equal(millesimalTableScopeMatchesUnit({scope_mode:"unknown"},unit),false);
console.log("PASS: millesimal table scope null safety and matching.");
