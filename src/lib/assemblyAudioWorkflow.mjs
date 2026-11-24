const READY_TRANSCRIPTION_STATUSES = new Set(["Da verificare", "Confermato"]);

export function hasManualAssemblyTranscription(assembly) {
  return typeof assembly?.transcriptionText === "string" && assembly.transcriptionText.trim().length > 0;
}

export function isAssemblyTranscriptionReady(assembly) {
  return hasManualAssemblyTranscription(assembly) &&
    READY_TRANSCRIPTION_STATUSES.has(assembly?.transcriptionStatus);
}

export function buildManualAssemblyMinutesDraft(assembly) {
  if (!isAssemblyTranscriptionReady(assembly)) return null;

  const transcription = assembly.transcriptionText.trim();
  return [
    "BOZZA DI VERBALE",
    "",
    assembly.title || "Assemblea",
    `Data: ${assembly.date || "da definire"}`,
    `Ora: ${assembly.time || "da definire"}`,
    `Luogo: ${assembly.place || "da definire"}`,
    "",
    "Trascrizione manuale:",
    transcription,
    "",
    "Questa bozza contiene la trascrizione inserita manualmente; non è una sintesi generata dall'AI.",
    "La trascrizione e il verbale devono essere verificati dall'amministratore prima della conferma o pubblicazione.",
  ].join("\n");
}

export function canConfirmAssemblyMinutes(assembly) {
  if (!isAssemblyTranscriptionReady(assembly) ||
      typeof assembly?.minutesDraft !== "string" ||
      !assembly.minutesDraft.trim()) return false;

  // Confirmation is allowed only for the exact draft generated from the current
  // transcript and assembly metadata. Any source edit makes the draft stale.
  return assembly.minutesDraft === buildManualAssemblyMinutesDraft(assembly);
}


export function canPublishAssemblyMinutes(assembly) {
  return assembly?.minutesStatus === "Confermato" &&
    canConfirmAssemblyMinutes(assembly);
}

export function confirmAssemblyMinutes(assembly) {
  if (!canConfirmAssemblyMinutes(assembly)) return null;

  return {
    ...assembly,
    minutesStatus: "Confermato",
    // A legacy unconfirmed record may carry a stale publication flag. Moving
    // from review to confirmation must not publish it implicitly.
    publishedToPortal: assembly.minutesStatus === "Confermato"
      ? Boolean(assembly.publishedToPortal)
      : false,
  };
}

export function reconcileAssemblyMinutesAfterEdit(assembly, previousAssembly = null) {
  // Moving an assembly to another condominium changes its publication audience,
  // even when the transcript and visible meeting metadata remain identical.
  if (previousAssembly && previousAssembly.condominiumId !== assembly?.condominiumId) {
    return {
      ...assembly,
      minutesStatus: "Non elaborato",
      minutesDraft: "",
      publishedToPortal: false,
    };
  }

  if (!canConfirmAssemblyMinutes(assembly)) {
    return {
      ...assembly,
      minutesStatus: "Non elaborato",
      minutesDraft: "",
      publishedToPortal: false,
    };
  }

  // A legacy unconfirmed publication flag must not become visible merely because
  // the administrator confirms a previously saved draft. Publication stays an
  // explicit action after confirmation.
  if (assembly.minutesStatus !== "Confermato") {
    return {
      ...assembly,
      publishedToPortal: false,
    };
  }

  return assembly;
}
