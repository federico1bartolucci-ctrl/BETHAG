function withPreviousPaymentEntry(query, previousId) {
  return previousId == null ? query.is("payment_entry_id", null) : query.eq("payment_entry_id", previousId);
}

/**
 * Roll back a SAL payment after work-event logging failed only if the SAL still
 * contains the state written by this payment. A concurrent payment is preserved.
 */
export async function compensateSalPaymentAfterEventFailure({
  supabase,
  workspaceId,
  progressId,
  ledgerEntryId,
  paidAmountBefore,
  paymentEntryIdBefore = null,
  paymentAmount,
}) {
  if (!supabase || typeof supabase.from !== "function" || ![workspaceId, progressId, ledgerEntryId].every((v) => typeof v === "string" && v.trim())) {
    throw new Error("Parametri compensazione pagamento SAL non validi.");
  }
  const before = Number(paidAmountBefore || 0);
  const amount = Number(paymentAmount);
  const after = before + amount;
  if (!Number.isFinite(before) || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(after)) {
    throw new Error("Importi compensazione pagamento SAL non validi.");
  }

  const { data: restored, error: rollbackError } = await supabase
    .from("condominium_work_progress")
    .update({ paid_amount: before, payment_entry_id: paymentEntryIdBefore ?? null })
    .eq("id", progressId)
    .eq("workspace_id", workspaceId)
    .eq("paid_amount", after)
    .eq("payment_entry_id", ledgerEntryId)
    .select("id")
    .maybeSingle();

  if (rollbackError) return { status: "rollback-error", error: rollbackError };
  if (!restored) return { status: "concurrent-change" };

  const { data: deleted, error: ledgerDeleteError } = await supabase
    .from("condominium_ledger_entries")
    .delete()
    .eq("id", ledgerEntryId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (!ledgerDeleteError && deleted) return { status: "compensated" };

  const deleteFailure = ledgerDeleteError || new Error("Movimento contabile non eliminato: nessuna riga interessata.");
  let restoreQuery = supabase
    .from("condominium_work_progress")
    .update({ paid_amount: after, payment_entry_id: ledgerEntryId })
    .eq("id", progressId)
    .eq("workspace_id", workspaceId)
    .eq("paid_amount", before);
  restoreQuery = withPreviousPaymentEntry(restoreQuery, paymentEntryIdBefore);
  const { data: paymentRestored, error: restoreError } = await restoreQuery.select("id").maybeSingle();
  if (restoreError || !paymentRestored) {
    return {
      status: "rollback-incomplete",
      deleteError: deleteFailure,
      restoreError: restoreError || new Error("Ripristino SAL non riuscito: stato cambiato concorrente."),
    };
  }
  return { status: "ledger-delete-failed", error: deleteFailure };
}
