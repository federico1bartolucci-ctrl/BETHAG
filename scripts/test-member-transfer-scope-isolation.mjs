import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createTransferHistoryScopeState,
  getVisibleTransferHistoryRows,
} from "../src/lib/memberTransferHistoryScope.mjs";

const oldRows = [{ id: "transfer-condo-a" }];
const oldState = createTransferHistoryScopeState("workspace-1:condo-a", oldRows);
assert.deepEqual(getVisibleTransferHistoryRows(oldState, "workspace-1:condo-b"), [],
  "rows from the previous condominium must be hidden immediately on scope change");
assert.deepEqual(getVisibleTransferHistoryRows(oldState, "workspace-1:condo-a"), oldRows,
  "rows remain visible only in their matching scope");
const loadingState = createTransferHistoryScopeState("workspace-1:condo-b");
assert.deepEqual(getVisibleTransferHistoryRows(loadingState, "workspace-1:condo-b"), [],
  "a new scope starts with no transfer rows");
assert.deepEqual(getVisibleTransferHistoryRows({ scopeKey: "workspace-1:condo-b", rows: null }, "workspace-1:condo-b"), [],
  "invalid stored row state fails closed");

const source = await readFile(new URL("../src/MemberTransferPanel.tsx", import.meta.url), "utf8");
assert.match(source, /getVisibleTransferHistoryRows\(transferHistoryState, transferHistoryScopeKey\)/,
  "rendered rows must be derived through the scope guard");
const effectStart = source.indexOf("useEffect(() => {", source.indexOf("const loadRows"));
const effectEnd = source.indexOf("async function makePreviewFor", effectStart);
assert.ok(effectStart >= 0 && effectEnd > effectStart, "transfer history scope effect exists");
const effect = source.slice(effectStart, effectEnd);
const resetIndex = effect.indexOf("setTransferHistoryState(createTransferHistoryScopeState(transferHistoryScopeKey))");
const loaderIndex = effect.indexOf("loadCondominiumTransferRows(workspaceId, condominiumId)");
assert.ok(resetIndex >= 0 && loaderIndex > resetIndex,
  "scope must be reset before asynchronous history fetch begins");
assert.match(effect, /setTransferHistoryState\(createTransferHistoryScopeState\(transferHistoryScopeKey, data\)\)/,
  "successful loads must retain the correct scope key");
console.log("Member-transfer history scope-isolation runtime regression: PASS");
