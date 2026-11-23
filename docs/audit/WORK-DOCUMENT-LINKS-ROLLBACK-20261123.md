# Work-document link replacement rollback — 23 November 2026

## Finding
The Register UI's `saveWorkDocuments()` replaces existing links by deleting them and inserting the newly selected links. If deletion succeeds but the subsequent insert fails, the previous associations are lost, even though the handler reports an error.

## Correction
- Capture the prior link rows before deleting them.
- Abort if the capture or delete fails.
- If the replacement insert fails, attempt to restore the captured rows.
- Surface an explicit error if restoration itself fails, so the administrator is warned that link state requires verification.
- Add a regression guard wired into `npm test`.

## Verification
Source, regression script and npm test wiring were re-fetched from the branch and statically inspected. Runtime tests/build/CI have not been executed from this environment.

## Safety
Draft PR stacked on #278. No merge, deployment, QA or Production changes.
