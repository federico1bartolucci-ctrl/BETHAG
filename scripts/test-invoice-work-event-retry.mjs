import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { shouldCreateInvoiceLinkedEvent } from "../src/lib/invoiceWorkEventRecovery.mjs";

const backendSource = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

assert.ok(packageJson.scripts.test.includes("test-invoice-work-event-retry.mjs"), "npm test must execute this regression");
assert.ok(backendSource.includes('import { shouldCreateInvoiceLinkedEvent } from "./invoiceWorkEventRecovery.mjs";'), "production code must import the tested helper");

const queryStart = backendSource.indexOf("const { data: existingInvoiceEvent, error: existingInvoiceEventError }");
assert.ok(queryStart >= 0, "invoice confirmation must query the existing linked event");
const guardStart = backendSource.indexOf("if (shouldCreateInvoiceLinkedEvent(existingInvoiceEvent))", queryStart);
assert.ok(guardStart > queryStart, "event insert must use the idempotency helper");
const queryBlock = backendSource.slice(queryStart, guardStart);
assert.ok(queryBlock.includes('.eq("workspace_id", workspaceId)'), "event lookup must be workspace-scoped");
assert.ok(queryBlock.includes('.eq("work_id", workId)'), "event lookup must be work-scoped");
assert.ok(queryBlock.includes('.eq("event_type", "invoice_linked")'), "event lookup must be type-scoped");
assert.ok(queryBlock.includes('.contains("data", { documentId: document.id, ledgerEntryId })'), "event lookup must match document and ledger IDs");
assert.ok(queryBlock.includes(".maybeSingle()"), "event lookup must fail on ambiguous matching rows");
const insertStart = backendSource.indexOf('from("condominium_work_events").insert({', guardStart);
assert.ok(insertStart > guardStart, "event insert must follow the event lookup");
const eventGuardBlock = backendSource.slice(guardStart, insertStart);
assert.ok(!eventGuardBlock.includes("existingWorkIds"), "event recovery must not depend on whether the document link already exists");

const workId = "work-7";
let workLinkExists = false;
let eventExists = false;
let eventInsertAttempts = 0;
async function confirmInvoiceWithPartialFailure() {
  if (!workLinkExists) workLinkExists = true; // work-document link is persisted before event insert
  if (shouldCreateInvoiceLinkedEvent(eventExists ? { id: "event-9" } : null)) {
    eventInsertAttempts += 1;
    if (eventInsertAttempts === 1) throw new Error("temporary work-event insert failure");
    eventExists = true;
  }
}
await assert.rejects(confirmInvoiceWithPartialFailure, /temporary work-event insert failure/);
assert.equal(workLinkExists, true, "first attempt should persist the document-work link");
assert.equal(eventExists, false, "first attempt should reproduce the missing-event state");
assert.equal(shouldCreateInvoiceLinkedEvent(null), true, "retry must create the missing event even when the work link already exists");
await confirmInvoiceWithPartialFailure();
assert.equal(eventExists, true, "retry should recover the event");
await confirmInvoiceWithPartialFailure();
assert.equal(eventInsertAttempts, 2, "subsequent retries must not duplicate an existing event");
assert.equal(shouldCreateInvoiceLinkedEvent({ id: "event-9" }), false, "existing event must suppress duplicate insertion");

console.log("Invoice linked work-event retry/idempotency regression: PASS");
