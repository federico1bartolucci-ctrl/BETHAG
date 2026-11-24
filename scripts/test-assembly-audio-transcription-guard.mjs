import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildManualAssemblyMinutesDraft,
  isAssemblyTranscriptionReady,
  canConfirmAssemblyMinutes,
  canPublishAssemblyMinutes,
  confirmAssemblyMinutes,
  reconcileAssemblyMinutesAfterEdit,
} from "../src/lib/assemblyAudioWorkflow.mjs";

// Reproduce the legacy false-positive: an audio filename and a fake "Da verificare"
// status were enough to enable minutes generation/confirmation without a transcript.
const legacyAssembly = {
  title: "Assemblea ordinaria",
  date: "2026-11-24",
  time: "18:00",
  place: "Sala condominiale",
  audioName: "assemblea.mp3",
  transcriptionStatus: "Da verificare",
  minutesStatus: "Da verificare",
  minutesDraft: "BOZZA DI VERBALE\n\nLa presente bozza è stata predisposta a partire dalla trascrizione.",
  transcriptionText: "",
};
assert.equal(isAssemblyTranscriptionReady(legacyAssembly), false);
assert.equal(buildManualAssemblyMinutesDraft(legacyAssembly), null);
assert.equal(canConfirmAssemblyMinutes(legacyAssembly), false);

// A transcript with a pending/in-progress status cannot be used.
const inProgress = { ...legacyAssembly, transcriptionStatus: "In elaborazione", transcriptionText: "Testo della trascrizione" };
assert.equal(buildManualAssemblyMinutesDraft(inProgress), null);

// A manually supplied transcript is the only accepted source for a draft.
const manuallyTranscribed = {
  ...legacyAssembly,
  transcriptionStatus: "Da verificare",
  transcriptionText: "L'assemblea approva il preventivo all'unanimità.",
  minutesDraft: "",
};
assert.equal(isAssemblyTranscriptionReady(manuallyTranscribed), true);
const draft = buildManualAssemblyMinutesDraft(manuallyTranscribed);
assert.ok(draft.includes("L'assemblea approva il preventivo all'unanimità."));
assert.ok(draft.includes("Trascrizione manuale:"));
assert.ok(draft.includes("non è una sintesi generata dall'AI"));
assert.equal(canConfirmAssemblyMinutes({ ...manuallyTranscribed, minutesDraft: draft }), true);
assert.equal(canConfirmAssemblyMinutes({ ...manuallyTranscribed, minutesDraft: " " }), false);

// Regression: the source transcript or metadata can change after draft generation.
// The previous guard accepted any non-empty draft, allowing confirmation of
// minutes that no longer represented the current assembly data.
const staleTranscript = {
  ...manuallyTranscribed,
  transcriptionText: "L'assemblea respinge il preventivo.",
  minutesDraft: draft,
};
assert.equal(canConfirmAssemblyMinutes(staleTranscript), false);

const staleDate = {
  ...manuallyTranscribed,
  date: "2026-11-25",
  minutesDraft: draft,
};
assert.equal(canConfirmAssemblyMinutes(staleDate), false);

const staleTitle = {
  ...manuallyTranscribed,
  title: "Assemblea straordinaria",
  minutesDraft: draft,
};
assert.equal(canConfirmAssemblyMinutes(staleTitle), false);

assert.equal(canConfirmAssemblyMinutes({ ...manuallyTranscribed, time: "19:00", minutesDraft: draft }), false);
assert.equal(canConfirmAssemblyMinutes({ ...manuallyTranscribed, place: "Sala diversa", minutesDraft: draft }), false);

// Regression: a stale confirmed minute could remain visible in the portal after
// editing its source, and the publication handler did not require confirmation.
const confirmedMinutes = {
  ...manuallyTranscribed,
  condominiumId: 101,
  minutesStatus: "Confermato",
  minutesDraft: draft,
  publishedToPortal: false,
};
assert.equal(canPublishAssemblyMinutes(confirmedMinutes), true);
assert.equal(canPublishAssemblyMinutes({ ...confirmedMinutes, minutesStatus: "Da verificare" }), false);

// Confirming a legacy unconfirmed record must clear its old publication flag.
// Re-confirming an already confirmed and published record must preserve publication.
const confirmedFromLegacyFlag = confirmAssemblyMinutes({
  ...manuallyTranscribed,
  minutesStatus: "Da verificare",
  minutesDraft: draft,
  publishedToPortal: true,
});
assert.equal(confirmedFromLegacyFlag.minutesStatus, "Confermato");
assert.equal(confirmedFromLegacyFlag.publishedToPortal, false);
assert.equal(canPublishAssemblyMinutes(confirmedFromLegacyFlag), true);
const reconfirmedPublished = confirmAssemblyMinutes({
  ...confirmedMinutes,
  publishedToPortal: true,
});
assert.equal(reconfirmedPublished.minutesStatus, "Confermato");
assert.equal(reconfirmedPublished.publishedToPortal, true);

const stalePublishedMinutes = {
  ...confirmedMinutes,
  time: "19:00",
  publishedToPortal: true,
};
assert.equal(canConfirmAssemblyMinutes(stalePublishedMinutes), false);
assert.equal(canPublishAssemblyMinutes(stalePublishedMinutes), false);
const invalidatedMinutes = reconcileAssemblyMinutesAfterEdit(stalePublishedMinutes);
assert.equal(invalidatedMinutes.minutesStatus, "Non elaborato");
assert.equal(invalidatedMinutes.minutesDraft, "");
assert.equal(invalidatedMinutes.publishedToPortal, false);

// Legacy records could have a publication flag while the minutes were only
// "Da verificare". Saving and then confirming must not silently republish them.
const legacyUnconfirmedPublication = reconcileAssemblyMinutesAfterEdit({
  ...manuallyTranscribed,
  minutesStatus: "Da verificare",
  minutesDraft: draft,
  publishedToPortal: true,
});
assert.equal(legacyUnconfirmedPublication.minutesStatus, "Da verificare");
assert.equal(legacyUnconfirmedPublication.minutesDraft, draft);
assert.equal(legacyUnconfirmedPublication.publishedToPortal, false);
const confirmedAfterLegacySave = {
  ...legacyUnconfirmedPublication,
  minutesStatus: "Confermato",
};
assert.equal(canPublishAssemblyMinutes(confirmedAfterLegacySave), true);
assert.equal(confirmedAfterLegacySave.publishedToPortal, false);

// Changing the condominium changes the resident audience. A previously
// confirmed and published minute must be invalidated and explicitly republished.
const movedCondominiumMinutes = reconcileAssemblyMinutesAfterEdit({
  ...confirmedMinutes,
  condominiumId: 202,
  publishedToPortal: true,
}, confirmedMinutes);
assert.equal(movedCondominiumMinutes.minutesStatus, "Non elaborato");
assert.equal(movedCondominiumMinutes.minutesDraft, "");
assert.equal(movedCondominiumMinutes.publishedToPortal, false);
assert.equal(canConfirmAssemblyMinutes(movedCondominiumMinutes), false);
assert.equal(canPublishAssemblyMinutes(movedCondominiumMinutes), false);

// An unrelated edit does not invalidate a current, confirmed and published draft.
const unchangedSource = reconcileAssemblyMinutesAfterEdit({
  ...confirmedMinutes,
  notes: "Nota amministrativa aggiornata",
  publishedToPortal: true,
}, confirmedMinutes);
assert.equal(unchangedSource.minutesStatus, "Confermato");
assert.equal(unchangedSource.minutesDraft, draft);
assert.equal(unchangedSource.publishedToPortal, true);


// The active component must use the tested guard and must not fake an audio
// upload/transcription state or delayed minutes generation.
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(main, /buildManualAssemblyMinutesDraft/);
assert.match(main, /confirmAssemblyMinutes/);
const attachStart = main.indexOf("const attachAssemblyAudio = (");
const generateStart = main.indexOf("const generateMinutes = (", attachStart);
assert.ok(attachStart >= 0 && generateStart > attachStart);
const attachHandler = main.slice(attachStart, generateStart);
assert.match(attachHandler, /alert\(/);
assert.doesNotMatch(attachHandler, /setAssemblies|transcriptionStatus|setTimeout/);
const confirmStart = main.indexOf("const confirmMinutes = (");
const publicationStart = main.indexOf("const toggleAssemblyPublication = (", confirmStart);
assert.ok(confirmStart >= 0 && publicationStart > confirmStart);
assert.match(main.slice(confirmStart, publicationStart), /confirmAssemblyMinutes\(assembly\)/);

const saveStart = main.indexOf("const saveAssembly = (");
const editAssemblyStart = main.indexOf("const editAssembly = (", saveStart);
assert.ok(saveStart >= 0 && editAssemblyStart > saveStart);
assert.match(main.slice(saveStart, editAssemblyStart), /reconcileAssemblyMinutesAfterEdit\(assemblyForm,\s*selectedAssembly\)/);
const publishStart = main.indexOf("const toggleAssemblyPublication = (");
const supplierStart = main.indexOf("FORNITORI", publishStart);
assert.ok(publishStart >= 0 && supplierStart > publishStart);
assert.match(main.slice(publishStart, supplierStart), /canPublishAssemblyMinutes/);
const visibleMinutesStart = main.indexOf("const visibleMinutes = assemblies.filter");
const visibleCommunicationsStart = main.indexOf("const visibleCommunications", visibleMinutesStart);
assert.ok(visibleMinutesStart >= 0 && visibleCommunicationsStart > visibleMinutesStart);
assert.match(main.slice(visibleMinutesStart, visibleCommunicationsStart), /canPublishAssemblyMinutes\(a\)/);

assert.match(main, /label="Trascrizione manuale \(necessaria per la bozza\)"/);
assert.match(main, /transcriptionStatus: v\.trim\(\) \? "Da verificare" : "Non elaborato"/);

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(pkg.scripts.test, /test-assembly-audio-transcription-guard\.mjs/);
console.log("Assembly audio transcription false-positive runtime regression: PASS");
console.log("Assembly minutes draft freshness runtime regression: PASS");
console.log("Assembly minutes publication freshness runtime regression: PASS");
console.log("Assembly minutes condominium-scope freshness runtime regression: PASS");
console.log("Assembly minutes explicit-confirmation publication regression: PASS");
