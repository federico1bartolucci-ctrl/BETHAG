import test from "node:test";
import assert from "node:assert/strict";
import { canSendCommunication, isCommunicationPublished } from "../supabase/functions/_shared/communication-send-guards.js";

test("only published communications can be sent", () => {
  assert.equal(isCommunicationPublished(true), true);
  assert.equal(isCommunicationPublished(false), false);
  assert.equal(isCommunicationPublished(null), false);
  assert.equal(isCommunicationPublished(undefined), false);
});

test("administrator can send regardless of collaborator permission shape", () => {
  assert.equal(canSendCommunication("admin", null), true);
  assert.equal(canSendCommunication("admin", {}), true);
});

test("collaborator array permissions are honored", () => {
  assert.equal(canSendCommunication("collaborator", ["comunicazioni"]), true);
  assert.equal(canSendCommunication("collaborator", ["documenti"]), false);
});

test("collaborator boolean-object permissions are honored", () => {
  assert.equal(canSendCommunication("collaborator", { comunicazioni: true }), true);
  assert.equal(canSendCommunication("collaborator", { comunicazioni: false }), false);
  assert.equal(canSendCommunication("collaborator", { documenti: true }), false);
});

test("residents and unknown roles cannot send", () => {
  assert.equal(canSendCommunication("resident", ["comunicazioni"]), false);
  assert.equal(canSendCommunication("unknown", { comunicazioni: true }), false);
});
