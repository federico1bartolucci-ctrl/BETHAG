import assert from "node:assert/strict";
import { parseBethagAmount } from "../src/lib/parseBethagAmount.mjs";
const cases=[
 ["1.234,56",1234.56],
 ["1,234.56",1234.56],
 ["1234,56",1234.56],
 ["1.234",1234],
 ["12,5",12.5],
 ["12.50",12.5],
 ["not valid",0],
 [null,0],
 [1234.5,1234.5],
];
for(const [input,expected] of cases) assert.equal(parseBethagAmount(input,0),expected,"millesimi "+String(input));
const source=await (await import("node:fs/promises")).readFile("src/main.tsx","utf8");
assert.match(source,/const millesimi = parseBethagAmount\(row\.millesimi, 0\)/,"AI allocation rows must use shared locale parser for millesimi");
console.log("PASS: AI allocation millesimi locale parsing.");
