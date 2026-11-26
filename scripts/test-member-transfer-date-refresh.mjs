import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/MemberTransferPanel.tsx", import.meta.url), "utf8");
const helperMatch = source.match(/function localISODate\(date = new Date\(\)\): string \{[\s\S]*?\n\}/);
assert.ok(helperMatch, "member transfer must use a local calendar-date helper");

const executable = helperMatch[0].replace(": string", "") +
  "\nconsole.log(JSON.stringify([\n" +
  '  localISODate(new Date("2026-11-24T23:30:00.000Z")),\n' +
  '  localISODate(new Date("2026-03-28T23:30:00.000Z")),\n' +
  '  localISODate(new Date("2026-03-29T01:30:00.000Z")),\n' +
  "]));\n";
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(
  JSON.parse(output),
  ["2026-11-25", "2026-03-29", "2026-03-29"],
  "member-transfer date defaults must follow the local calendar at midnight and across DST",
);

assert.match(source, /const \[transferDate, setTransferDate\] = useState\(localISODate\(\)\)/);
assert.match(source, /const transferDateEditedRef = useRef\(false\)/);
assert.match(source, /if \(transferDateEditedRef\.current\) return transferDate/);
assert.match(source, /const currentTransferDate = transferDateEditedRef\.current \? transferDate : localISODate\(\)/);
assert.match(source, /onFocus=\{handleTransferDateFocus\}/);
assert.match(source, /transferDateEditedRef\.current = true;/, "manual date changes must be preserved");
assert.match(source, /preview\.transfer_date !== nextDate/, "confirmation must reject a stale accounting preview");
assert.match(source, /p_transfer_date: nextDate/, "the confirmed RPC must receive the same date used by the validated preview");
assert.match(source, /async function confirmTransfer\(\) \{\s*const nextDate = refreshTransferDateIfUntouched\(\)/, "the final confirmation must refresh an untouched date immediately before the RPC");
assert.match(
  source,
  /transferDateEditedRef\.current = false;\s*setTransferDate\(localISODate\(\)\)/,
  "a successful transfer must reset the next form to today's local date",
);
assert.equal(
  source.split("const currentDate = refreshTransferDateIfUntouched();").length - 1,
  2,
  "unit and outgoing-member selection must refresh the untouched date",
);
assert.match(
  source,
  /<label>Modalità trasferimento<select[\s\S]*?refreshTransferDateIfUntouched\(\);/,
  "changing transfer scope must also refresh an untouched default date",
);
assert.match(source, /async function makePreview\(\) \{\s*const nextDate = refreshTransferDateIfUntouched\(\)/);
assert.match(source, /function openConfirmation\(\) \{\s*const nextDate = refreshTransferDateIfUntouched\(\)/);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-member-transfer-date-refresh.mjs"));

console.log("Member-transfer local-date refresh regression checks passed.");
