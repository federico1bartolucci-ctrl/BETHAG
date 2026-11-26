import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  filterCondominiumMembersToWorkspace,
  loadPaginatedRowsByInFilter,
} from "../src/lib/paginatedWorkspaceRows.ts";

function createMockClient(pages, errorKey = null) {
  const requests = [];
  const client = {
    from(table) {
      assert.equal(table, "condominium_members");
      const state = { table, filterColumn: null, filterValues: [], orders: [] };
      const query = {
        select(columns) {
          state.columns = columns;
          return query;
        },
        in(column, values) {
          state.filterColumn = column;
          state.filterValues = [...values];
          return query;
        },
        order(column, options) {
          state.orders.push([column, options]);
          return query;
        },
        range(from, to) {
          const request = { ...state, filterValues: [...state.filterValues], from, to };
          requests.push(request);
          const key = `${state.filterValues[0]}:${from}`;
          if (key === errorKey) {
            return Promise.resolve({ data: null, error: new Error("member page failed") });
          }
          return Promise.resolve({ data: pages.get(key) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const condominiumIds = Array.from({ length: 101 }, (_, index) => `condo-${String(index).padStart(3, "0")}`);
const firstPage = Array.from({ length: 1000 }, (_, index) => ({ id: `member-${index}`, condominium_id: condominiumIds[0] }));
const secondPage = [{ id: "member-after-limit", condominium_id: condominiumIds[0] }];
const lastChunkRows = [
  { id: "member-last-condo-1", condominium_id: condominiumIds[100] },
  { id: "member-last-condo-2", condominium_id: condominiumIds[100] },
];
const { client, requests } = createMockClient(new Map([
  [`${condominiumIds[0]}:0`, firstPage],
  [`${condominiumIds[0]}:1000`, secondPage],
  [`${condominiumIds[100]}:0`, lastChunkRows],
]));

const rows = await loadPaginatedRowsByInFilter(
  client,
  "condominium_members",
  "condominium_id",
  condominiumIds,
  "id",
);
assert.equal(rows.length, 1003, "all members across chunks and pages must be exported");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999], [0, 999]]);
assert.deepEqual(requests.map((request) => request.filterValues.length), [100, 100, 1]);
assert.ok(requests.every((request) => request.filterColumn === "condominium_id"));
assert.ok(requests.every((request) => request.orders[0]?.[0] === "id"));
assert.ok(requests.every((request) => request.table === "condominium_members"));

const emptyMock = createMockClient(new Map());
assert.deepEqual(
  await loadPaginatedRowsByInFilter(emptyMock.client, "condominium_members", "condominium_id", [], "id"),
  [],
);
assert.equal(emptyMock.requests.length, 0, "an empty workspace condominium set must not issue an unscoped query");

const failingMock = createMockClient(new Map([
  [`${condominiumIds[0]}:0`, firstPage],
]), `${condominiumIds[0]}:1000`);
await assert.rejects(
  loadPaginatedRowsByInFilter(failingMock.client, "condominium_members", "condominium_id", condominiumIds.slice(0, 1), "id"),
  /member page failed/,
  "a later-page failure must reject rather than silently export partial members",
);

const filtered = filterCondominiumMembersToWorkspace([
  { id: "member-1", condominium_id: "condo-1", name: "Resident A" },
  { id: "member-2", condominium_id: "condo-2", name: "Resident B", workspace_id: "untrusted" },
  { id: "member-3", condominium_id: "foreign-condo", name: "Foreign resident" },
  { id: "member-4", condominium_id: null, name: "Unscoped resident" },
], ["condo-1", "condo-2"]);
assert.deepEqual(filtered.rows, [
  { id: "member-1", condominium_id: "condo-1", name: "Resident A" },
  { id: "member-2", condominium_id: "condo-2", name: "Resident B" },
]);
assert.equal(filtered.skipped, 2);
assert.ok(filtered.rows.every((row) => !Object.hasOwn(row, "workspace_id")));

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const schema = await readFile(
  new URL("../supabase/migrations/20261017000001_bethag_baseline_schema.sql", import.meta.url),
  "utf8",
);
const exportStart = mainSource.indexOf("const exportWorkspaceBackup = async () => {");
const exportEnd = mainSource.indexOf("/* =======================================================\n     CONDOMINI", exportStart);
assert.ok(exportStart >= 0 && exportEnd > exportStart, "workspace backup export function must exist");
const exportFunction = mainSource.slice(exportStart, exportEnd);
assert.match(exportFunction, /backend\.condominiums\s*=\s*await loadPaginatedWorkspaceRows/);
assert.match(exportFunction, /const condominiumIds = Array\.isArray\(backend\.condominiums\)/);
assert.match(exportFunction, /loadPaginatedRowsByInFilter\(supabase, table, "condominium_id", condominiumIds, "id"\)/);
assert.match(exportFunction, /table === "condominium_members"/);

const restoreStart = mainSource.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = mainSource.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace backup restore function must exist");
const restoreFunction = mainSource.slice(restoreStart, restoreEnd);
assert.match(restoreFunction, /restoredCondominiumIds = new Set/);
assert.match(restoreFunction, /filterCondominiumMembersToWorkspace\(rows, \[\.\.\.restoredCondominiumIds\]\)/);
assert.match(restoreFunction, /supabase\.from\(table\)\.upsert\(scoped\.rows, \{ onConflict: "id" \}\)/);
assert.ok(
  restoreFunction.indexOf('if (table === "condominium_members")') <
    restoreFunction.lastIndexOf('const normalized = rows.map((row: any) => ({ ...row, workspace_id: profile.workspaceId }));'),
  "member restore must bypass the generic workspace_id normalization",
);

const memberDefinition = schema.match(/CREATE TABLE "public"\."condominium_members" \(([\s\S]*?)\n\);/);
assert.ok(memberDefinition, "condominium_members table definition must exist");
assert.match(memberDefinition[1], /"condominium_id"\s+uuid/);
assert.doesNotMatch(memberDefinition[1], /"workspace_id"\s+uuid/, "condominium_members has no workspace_id column");
assert.ok(packageJson.scripts.test.includes("test-backup-condominium-members-scope.mjs"));

console.log("Workspace backup condominium-member scope regression checks passed.");
