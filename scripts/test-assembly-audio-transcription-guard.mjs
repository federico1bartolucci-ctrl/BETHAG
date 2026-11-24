import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildManualAssemblyMinutesDraft,
  isAssemblyTranscriptionReady,
  canConfirmAssemblyMinutes,
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

// The active component must use the tested guard and must not fake an audio
// upload/transcription state or delayed minutes generation.
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(main, /buildManualAssemblyMinutesDraft/);
assert.match(main, /canConfirmAssemblyMinutes/);
const attachStart = main.indexOf("const attachAssemblyAudio = (");
const generateStart = main.indexOf("const generateMinutes = (", attachStart);
assert.ok(attachStart >= 0 && generateStart > attachStart);
const attachHandler = main.slice(attachStart, generateStart);
assert.match(attachHandler, /alert\(/);
assert.doesNotMatch(attachHandler, /setAssemblies|transcriptionStatus|setTimeout/);
const confirmStart = main.indexOf("const confirmMinutes = (");
const publicationStart = main.indexOf("const toggleAssemblyPublication = (", confirmStart);
assert.ok(confirmStart >= 0 && publicationStart > confirmStart);
assert.match(main.slice(confirmStart, publicationStart), /canConfirmAssemblyMinutes/);
assert.match(main, /label="Trascrizione manuale \(necessaria per la bozza\)"/);
assert.match(main, /transcriptionStatus: v\.trim\(\) \? "Da verificare" : "Non elaborato"/);

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(pkg.scripts.test, /test-assembly-audio-transcription-guard\.mjs/);
console.log("Assembly audio transcription false-positive runtime regression: PASS");
