/**
 * Run the work-history write after the work row has already been persisted.
 *
 * A history failure must not be allowed to turn a successful work save into
 * an apparent save failure: the still-open form could be submitted again and
 * create a duplicate work. The caller closes the form and reports the
 * returned warning instead.
 *
 * @returns {Promise<boolean>} true when the history write failed.
 */
export async function recordWorkHistoryAfterSave(writeHistory) {
  if (typeof writeHistory !== "function") {
    throw new TypeError("Work history writer must be a function.");
  }

  try {
    await writeHistory();
    return false;
  } catch {
    return true;
  }
}
