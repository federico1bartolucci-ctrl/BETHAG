import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
assert.match(helper, /export function localISODateAfterDays\(days: number, date = new Date\(\)\)/);
assert.match(helper, /nextDate\.setDate\(nextDate\.getDate\(\) \+ days\)/);

const register = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.match(register, /import \{ localISODate, localISODateAfterDays \} from "\.\/lib\/local-date"/);
assert.match(register, /expected_end_date\|\|localISODateAfterDays\(7\)/);
assert.match(register, /expected_end_date\|\|w\.start_date\|\|localISODateAfterDays\(7\)/);
assert.match(register, /expiry_date\|\|localISODateAfterDays\(7\)/);
assert.equal((register.match(/localISODateAfterDays\(7\)/g) ?? []).length, 3);
assert.doesNotMatch(register, /new Date\(Date\.now\(\)\+7\*86400000\)\.toISOString\(\)\.slice\(0,10\)/);

const executable = helper.replaceAll("export function", "function").replace("days: number", "days")
  + String.fromCharCode(10)
  + [
    'const november = new Date("2026-11-22T23:30:00.000Z");',
    'const dstStart = new Date("2026-03-28T23:30:00.000Z");',
    'console.log(JSON.stringify({',
    '  novemberLocal: localISODate(november),',
    '  novemberPlusSeven: localISODateAfterDays(7, november),',
    '  novemberMinusSeven: localISODateAfterDays(-7, november),',
    '  novemberOldUtc: new Date(november.getTime() + 7 * 86400000).toISOString().slice(0, 10),',
    '  dstLocal: localISODate(dstStart),',
    '  dstPlusSeven: localISODateAfterDays(7, dstStart),',
    '  dstOldUtc: new Date(dstStart.getTime() + 7 * 86400000).toISOString().slice(0, 10),',
    '}));',
  ].join(String.fromCharCode(10));
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(JSON.parse(output), {
  novemberLocal: "2026-11-23",
  novemberPlusSeven: "2026-11-30",
  novemberMinusSeven: "2026-11-16",
  novemberOldUtc: "2026-11-29",
  dstLocal: "2026-03-29",
  dstPlusSeven: "2026-04-05",
  dstOldUtc: "2026-04-04",
});
console.log("Register local activity date regression checks passed.");
