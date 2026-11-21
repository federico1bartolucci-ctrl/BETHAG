export async function linkRegisterProgressPaymentOrCompensate(
  client,
  workspaceId,
  progressId,
  paymentEntryId,
  nextPaidAmount
) {
  const { data: updatedProgress, error: updateError } = await client
    .from("condominium_work_progress")
    .update({ paid_amount: nextPaidAmount, payment_entry_id: paymentEntryId })
    .eq("id", progressId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedProgress?.id) {
    const { error: rollbackError } = await client
      .from("condominium_ledger_entries")
      .delete()
      .eq("id", paymentEntryId)
      .eq("workspace_id", workspaceId);

    if (rollbackError) {
      throw new Error(
        "Pagamento non collegato al SAL: aggiornamento SAL fallito e rollback contabile non riuscito. " +
          "Verifica la scrittura " + paymentEntryId + ". " +
          (updateError?.message || "SAL non trovato") + "; rollback: " + rollbackError.message
      );
    }

    if (updateError) {
      throw new Error(
        "Pagamento non collegato al SAL: scrittura contabile annullata dopo il fallimento dell'aggiornamento SAL. " +
          updateError.message
      );
    }

    throw new Error(
      "Pagamento non collegato al SAL: il SAL non esiste più o non è aggiornabile. " +
        "La scrittura contabile " + paymentEntryId + " è stata annullata."
    );
  }

  return updatedProgress.id;
}
