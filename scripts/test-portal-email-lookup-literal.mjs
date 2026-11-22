import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { escapePostgrestIlikeLiteral } from "../src/lib/escapePostgrestIlikeLiteral.mjs";
import { resolveUniqueWorkspaceId } from "../src/lib/resolveUniquePortalWorkspace.mjs";

function escapeRegexCharacter(character) {
  const special = new Set([".", "*", "+", "?", "^", "$", "(", ")", "[", "]", "{", "}", "|", "\\"]);
  return special.has(character) ? "\\" + character : character;
}

// Small runtime model of PostgreSQL LIKE/ILIKE wildcard and escape behavior.
function matchesLike(value, pattern) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "\\") {
      const next = pattern[index + 1];
      if (next === undefined) {
        expression += escapeRegexCharacter(character);
      } else {
        expression += escapeRegexCharacter(next);
        index += 1;
      }
    } else if (character === "%") {
      expression += ".*";
    } else if (character === "_") {
      expression += ".";
    } else {
      expression += escapeRegexCharacter(character);
    }
  }
  return new RegExp("^" + expression + "$", "i").test(value);
}

const emailWithUnderscore = "resident_1@example.it";
const escapedUnderscore = escapePostgrestIlikeLiteral(emailWithUnderscore);
assert.equal(escapedUnderscore, "resident\\_1@example.it");
assert.equal(matchesLike("residentX1@example.it", emailWithUnderscore), true, "unescaped underscore reproduces the false match");
assert.equal(matchesLike("residentX1@example.it", escapedUnderscore), false, "escaped underscore is literal");
assert.equal(matchesLike(emailWithUnderscore, escapedUnderscore), true, "literal email still matches case-insensitively");
assert.equal(matchesLike("RESIDENT_1@EXAMPLE.IT", escapedUnderscore), true, "ILIKE case-insensitive behavior is retained");

const emailWithPercent = "resident%1@example.it";
const escapedPercent = escapePostgrestIlikeLiteral(emailWithPercent);
assert.equal(matchesLike("residentX1@example.it", emailWithPercent), true, "unescaped percent reproduces the false match");
assert.equal(matchesLike("residentX1@example.it", escapedPercent), false, "escaped percent is literal");
assert.equal(matchesLike(emailWithPercent, escapedPercent), true);

const emailWithBackslash = "resident\\\\1@example.it";
const escapedBackslash = escapePostgrestIlikeLiteral(emailWithBackslash);
assert.equal(matchesLike(emailWithBackslash, escapedBackslash), true, "backslash itself is escaped");

assert.equal(resolveUniqueWorkspaceId([{ workspace_id: "workspace-a" }]), "workspace-a");
assert.throws(
  () => resolveUniqueWorkspaceId([{ workspace_id: "workspace-a" }, { workspace_id: "workspace-b" }]),
  /associato a più workspace/,
  "session restoration must not choose an arbitrary workspace"
);

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(source, /import\s+\{\s*escapePostgrestIlikeLiteral\s*\}\s+from\s+["']\.\/lib\/escapePostgrestIlikeLiteral\.mjs["']/);

const resolverStart = source.indexOf("const resolveSupabaseAccess = async");
const resolverEnd = source.indexOf("const handleLogin = async", resolverStart);
assert.ok(resolverStart >= 0 && resolverEnd > resolverStart, "portal login resolver exists");
const resolver = source.slice(resolverStart, resolverEnd);
assert.match(resolver, /\.ilike\(["']email["'],\s*escapePostgrestIlikeLiteral\(email\.trim\(\)\)\)/, "login email pattern is escaped");

const hydrationStart = source.indexOf("const hydrateFromBackend = async");
const hydrationEnd = source.indexOf("const refreshBackendState = async", hydrationStart);
assert.ok(hydrationStart >= 0 && hydrationEnd > hydrationStart, "session hydration function exists");
const hydration = source.slice(hydrationStart, hydrationEnd);
const queryStart = hydration.indexOf('.from("portal_access")');
const queryEnd = hydration.indexOf('.from("workspaces")', queryStart);
assert.ok(queryStart >= 0 && queryEnd > queryStart, "session portal-access query exists");
const sessionPortalQuery = hydration.slice(queryStart, queryEnd);
assert.match(sessionPortalQuery, /\.ilike\(["']email["'],\s*escapePostgrestIlikeLiteral\(session\.user\.email\s*\|\|\s*""\)\)/, "session email pattern is escaped");
assert.match(sessionPortalQuery, /\.in\(["']role["'],\s*\["resident",\s*"council"\]\)/, "only portal roles are considered");
assert.match(sessionPortalQuery, /\.range\(offset,\s*offset\s*\+\s*999\)/, "session lookup paginates");
assert.match(hydration, /workspaceId\s*=\s*resolveUniqueWorkspaceId\(portalRows\)/, "session lookup rejects multiple workspace scopes");
assert.doesNotMatch(sessionPortalQuery, /\.limit\(1\)/, "session lookup must not select an arbitrary workspace");

const emailPatternQueries = [...source.matchAll(/\.ilike\(["']email["']/g)];
assert.ok(emailPatternQueries.length >= 2, "both email lookup paths remain case-insensitive");
for (const match of emailPatternQueries) {
  assert.ok(
    source.slice(match.index, match.index + 150).includes("escapePostgrestIlikeLiteral"),
    "every email ILIKE query must escape wildcard characters"
  );
}
assert.match(packageJson.scripts.test, /test-portal-email-lookup-literal\.mjs/, "regression is wired into npm test");
console.log("Portal email literal-match and session-scope regression: PASS");
