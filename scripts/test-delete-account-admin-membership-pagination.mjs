import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ACTIVE_ADMIN_MEMBERSHIP_PAGE_SIZE,
  listActiveAdminMemberships,
} from "../supabase/functions/_shared/active-admin-memberships.js";

function makeRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    workspace_id: `workspace-${String(index + 1).padStart(5, "0")}`,
    user_id: "user-1",
    role: "admin",
    active: true,
  }));
}

function createClient({
  rows,
  serverLimit = ACTIVE_ADMIN_MEMBERSHIP_PAGE_SIZE,
  countForCall,
  pageForCall,
} = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, "workspace_members");
      return {
        select(columns, options) {
          assert.equal(columns, "workspace_id");
          assert.equal(options?.count, "exact");
          const filters = {};
          const query = {
            eq(column, value) {
              filters[column] = value;
              return query;
            },
            order(column, options) {
              assert.equal(column, "workspace_id");
              assert.equal(options?.ascending, true);
              return query;
            },
            async range(from, to) {
              const callIndex = calls.length;
              calls.push({ from, to, filters: { ...filters } });
              const filtered = rows
                .filter((row) =>
                  Object.entries(filters).every(([key, value]) => row[key] === value)
                )
                .slice()
                .sort((left, right) => left.workspace_id.localeCompare(right.workspace_id));
              const count = countForCall ? countForCall(callIndex, filtered.length) : filtered.length;
              const page = pageForCall
                ? pageForCall(callIndex, filtered.slice(from, Math.min(to + 1, from + serverLimit)))
                : filtered.slice(from, Math.min(to + 1, from + serverLimit));
              return { data: page, error: null, count };
            },
          };
          return query;
        },
      };
    },
  };
}

const allRows = makeRows(1205);

// Reproduce the old one-page query: with a 200-row PostgREST cap, the
// 1,205th administrator workspace is silently omitted by an unpaginated read.
const legacyFirstPage = allRows.slice(0, 200);
assert.equal(legacyFirstPage.length, 200);
assert.equal(
  legacyFirstPage.some((row) => row.workspace_id === allRows[1204].workspace_id),
  false,
  "The previous single-page read must reproduce the omitted last-admin workspace.",
);

const cappedClient = createClient({ rows: allRows, serverLimit: 200 });
const memberships = await listActiveAdminMemberships(cappedClient, "user-1");
assert.equal(memberships.length, 1205);
assert.deepEqual(memberships.map((row) => row.workspace_id), allRows.map((row) => row.workspace_id));
assert.equal(cappedClient.calls.length, 7);
assert.deepEqual(cappedClient.calls.map((call) => call.from), [0, 200, 400, 600, 800, 1000, 1200]);
assert.ok(cappedClient.calls.every((call) =>
  call.filters.user_id === "user-1" &&
  call.filters.role === "admin" &&
  call.filters.active === true
));

const emptyClient = createClient({ rows: [] });
assert.deepEqual(await listActiveAdminMemberships(emptyClient, "user-1"), []);
assert.equal(emptyClient.calls.length, 1);

const changingCountClient = createClient({
  rows: allRows,
  serverLimit: 500,
  countForCall: (callIndex, actualCount) => callIndex === 0 ? actualCount : actualCount - 1,
});
await assert.rejects(
  () => listActiveAdminMemberships(changingCountClient, "user-1"),
  /changed during pagination/,
);

const incompletePageClient = createClient({
  rows: allRows,
  serverLimit: 500,
  pageForCall: (callIndex, page) => callIndex === 1 ? [] : page,
});
await assert.rejects(
  () => listActiveAdminMemberships(incompletePageClient, "user-1"),
  /ended before the exact count/,
);

const missingCountClient = createClient({
  rows: allRows,
  countForCall: () => null,
});
await assert.rejects(
  () => listActiveAdminMemberships(missingCountClient, "user-1"),
  /exact count/,
);

const duplicateRowsClient = createClient({
  rows: [allRows[0], allRows[0]],
  serverLimit: 500,
});
await assert.rejects(
  () => listActiveAdminMemberships(duplicateRowsClient, "user-1"),
  /duplicate workspace/,
);

const handler = await readFile("supabase/functions/delete-account/index.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-delete-account-admin-membership-pagination\.mjs/);
assert.match(handler, /listActiveAdminMemberships\(ctx\.supabaseAdmin,\s*userId\)/);
assert.equal(
  (handler.match(/listActiveAdminMemberships\(ctx\.supabaseAdmin,\s*userId\)/g) ?? []).length,
  2,
  "Both the pre-delete check and post-failure recheck must use the complete service-role membership reader.",
);
assert.doesNotMatch(
  handler,
  /from\(["']workspace_members["']\)\s*\.select\(["']workspace_id["']\)\s*\.eq\(["']user_id["']/,
  "The Edge Function must not retain the old unpaginated user-scoped membership read.",
);

console.log("Delete-account administrator membership pagination runtime regression: PASS");
console.log("Legacy single-page omission reproduced with 1,205 memberships: PASS");
console.log("All memberships returned across a lower server row cap: PASS");
console.log("Missing counts, changing snapshots, incomplete pages and duplicates fail closed: PASS");
console.log("Pre-delete and post-failure checks use the complete service-role reader: PASS");
