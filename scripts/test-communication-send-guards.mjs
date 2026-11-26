import assert from "node:assert/strict";
import { canSendCommunication } from "../supabase/functions/_shared/communication-send-guards.js";

assert.equal(canSendCommunication("admin", null), true, "administrators may send communications");
assert.equal(canSendCommunication("collaborator", ["comunicazioni"]), true, "collaborators with the communications permission may send");
assert.equal(canSendCommunication("collaborator", { comunicazioni: true }), true, "object-shaped collaborator permissions may send");
assert.equal(canSendCommunication("collaborator", { comunicazioni: false }), false, "explicitly denied communications permission must block sending");
assert.equal(canSendCommunication("collaborator", []), false, "missing communications permission must block sending");
assert.equal(canSendCommunication("resident", ["comunicazioni"]), false, "residents cannot send administrative communications");
console.log("Communication send role guards passed.");
